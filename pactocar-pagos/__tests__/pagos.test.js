'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-pactocar';

jest.mock('../db', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const db = require('../db');

const tokenConductor = jwt.sign({ id: 3, rol_id: 3, verificado: true }, process.env.JWT_SECRET);
const tokenPropietario = jwt.sign({ id: 2, rol_id: 2, verificado: true }, process.env.JWT_SECRET);

afterEach(() => jest.clearAllMocks());

// contratos-service se sustituye por un doble: los tests no salen a la red
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ status: 201 });
});

// ─── POST /api/pagos ─────────────────────────────────────────────────────────

describe('POST /api/pagos', () => {
  test('201 — conductor paga una reserva confirmada y se retiene la garantia', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10, conductor_id: 3, monto_total: 100000, estado: 'confirmada' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10, monto: 100000, garantia: 20000, comision: 10000, metodo: 'tarjeta_credito', estado: 'pagado', estado_garantia: 'retenida' }] });

    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });

    expect(res.status).toBe(201);
    expect(res.body.pago).toHaveProperty('id');
    // garantia = 20% de 100000 = 20000 ; comision = 10% = 10000
    const insertArgs = db.query.mock.calls[2][1];
    expect(insertArgs[2]).toBe(20000);
    expect(insertArgs[3]).toBe(10000);
  });

  test('201 — al pagar se pide el contrato a contratos-service por HTTP', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10, conductor_id: 3, monto_total: 100000, estado: 'confirmada' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10 }] });

    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });

    expect(res.status).toBe(201);
    expect(res.body.contrato).toEqual({ generado: true });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3006/api/contratos');
    expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body)).toEqual({ reserva_id: 10 });
    // El token del conductor se reenvia para que contratos valide la identidad
    expect(opciones.headers.Authorization).toBe(`Bearer ${tokenConductor}`);
  });

  test('201 — el pago sigue siendo valido si contratos-service no responde', async () => {
    global.fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10, conductor_id: 3, monto_total: 100000, estado: 'confirmada' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10 }] });

    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });

    expect(res.status).toBe(201);
    expect(res.body.pago).toHaveProperty('id');
    expect(res.body.contrato.generado).toBe(false);
  });

  test('403 — propietario no puede pagar', async () => {
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(403);
  });

  test('400 — falta el id de la reserva', async () => {
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('404 — reserva no existe', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 99 });
    expect(res.status).toBe(404);
  });

  test('403 — la reserva es de otro conductor', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 10, conductor_id: 7, monto_total: 100000, estado: 'confirmada' }] });
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(403);
  });

  test('422 — reserva no esta confirmada', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 10, conductor_id: 3, monto_total: 100000, estado: 'pendiente' }] });
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(422);
  });

  test('409 — la reserva ya fue pagada', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10, conductor_id: 3, monto_total: 100000, estado: 'confirmada' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(409);
  });

  test('401 — sin token', async () => {
    const res = await request(app).post('/api/pagos').send({ reserva_id: 10 });
    expect(res.status).toBe(401);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/pagos/mios ─────────────────────────────────────────────────────

describe('GET /api/pagos/mios', () => {
  test('200 — conductor obtiene sus pagos', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10, monto: 100000 }] });
    const res = await request(app)
      .get('/api/pagos/mios')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('403 — propietario no puede ver pagos de conductor', async () => {
    const res = await request(app)
      .get('/api/pagos/mios')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(403);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/pagos/mios')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/pagos/reserva/:reservaId ───────────────────────────────────────

describe('GET /api/pagos/reserva/:reservaId', () => {
  test('200 — devuelve el pago de la reserva', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10 }] });
    const res = await request(app)
      .get('/api/pagos/reserva/10')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.body.pago).toHaveProperty('reserva_id', 10);
  });

  test('200 — null si la reserva no tiene pago', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/pagos/reserva/99')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.body.pago).toBeNull();
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/pagos/reserva/10')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});

// ─── PATCH /api/pagos/:id/liberar-garantia ───────────────────────────────────

describe('PATCH /api/pagos/:id/liberar-garantia', () => {
  test('200 — propietario libera la garantia de una reserva finalizada', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, estado_garantia: 'retenida', estado_reserva: 'finalizada' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, estado_garantia: 'liberada' }] });
    const res = await request(app)
      .patch('/api/pagos/1/liberar-garantia')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(200);
    expect(res.body.pago.estado_garantia).toBe('liberada');
  });

  test('403 — conductor no puede liberar garantia', async () => {
    const res = await request(app)
      .patch('/api/pagos/1/liberar-garantia')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(403);
  });

  test('404 — pago no encontrado o no pertenece al propietario', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/pagos/99/liberar-garantia')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(404);
  });

  test('422 — la reserva aun no esta finalizada', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, estado_garantia: 'retenida', estado_reserva: 'en_curso' }] });
    const res = await request(app)
      .patch('/api/pagos/1/liberar-garantia')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(422);
  });

  test('409 — la garantia ya fue liberada', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, estado_garantia: 'liberada', estado_reserva: 'finalizada' }] });
    const res = await request(app)
      .patch('/api/pagos/1/liberar-garantia')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(409);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .patch('/api/pagos/1/liberar-garantia')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(500);
  });
});

// ─── PATCH /api/pagos/:id/reembolsar ─────────────────────────────────────────

describe('PATCH /api/pagos/:id/reembolsar', () => {
  test('200 — reembolsa el pago de una reserva cancelada', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pagado', estado_reserva: 'cancelada', conductor_id: 3, propietario_id: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'reembolsado', estado_garantia: 'liberada' }] });
    const res = await request(app)
      .patch('/api/pagos/1/reembolsar')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.body.pago.estado).toBe('reembolsado');
  });

  test('403 — un tercero no puede reembolsar', async () => {
    const tokenOtro = jwt.sign({ id: 8, rol_id: 3, verificado: true }, process.env.JWT_SECRET);
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pagado', estado_reserva: 'cancelada', conductor_id: 3, propietario_id: 2 }] });
    const res = await request(app)
      .patch('/api/pagos/1/reembolsar')
      .set('Authorization', `Bearer ${tokenOtro}`);
    expect(res.status).toBe(403);
  });

  test('404 — pago no encontrado', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/pagos/99/reembolsar')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(404);
  });

  test('422 — la reserva no esta cancelada', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pagado', estado_reserva: 'finalizada', conductor_id: 3, propietario_id: 2 }] });
    const res = await request(app)
      .patch('/api/pagos/1/reembolsar')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(422);
  });

  test('409 — el pago ya fue reembolsado', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'reembolsado', estado_reserva: 'cancelada', conductor_id: 3, propietario_id: 2 }] });
    const res = await request(app)
      .patch('/api/pagos/1/reembolsar')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(409);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .patch('/api/pagos/1/reembolsar')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});
