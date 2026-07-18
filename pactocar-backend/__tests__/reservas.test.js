'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-pactocar';

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
  PutObjectCommand: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const db = require('../db');

const tokenConductor = jwt.sign({ id: 3, rol_id: 3, verificado: true }, process.env.JWT_SECRET);
const tokenPropietario = jwt.sign({ id: 2, rol_id: 2, verificado: true }, process.env.JWT_SECRET);
const tokenNoVerificado = jwt.sign({ id: 5, rol_id: 3, verificado: false }, process.env.JWT_SECRET);

afterEach(() => jest.clearAllMocks());

// ─── POST /api/reservas ──────────────────────────────────────────────────────

describe('POST /api/reservas', () => {
  const payload = { vehiculo_id: 1, fecha_inicio: '2027-01-10', fecha_fin: '2027-01-15' };

  test('201 — conductor crea reserva correctamente y calcula el monto', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, propietario_id: 2, disponible: true, precio_diario_clp: 20000 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 10, vehiculo_id: 1, conductor_id: 3, fecha_inicio: '2027-01-10', fecha_fin: '2027-01-15', monto_total: 100000, estado: 'pendiente' }] });

    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.reserva).toHaveProperty('id');
    // 5 dias (10 -> 15 ene) * 20000 = 100000
    const insertArgs = db.query.mock.calls[2][1];
    expect(insertArgs[4]).toBe(100000);
  });

  test('403 — propietario no puede crear reservas', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send(payload);
    expect(res.status).toBe(403);
  });

  test('403 — conductor no verificado es rechazado', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenNoVerificado}`)
      .send(payload);
    expect(res.status).toBe(403);
  });

  test('400 — faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ vehiculo_id: 1 });
    expect(res.status).toBe(400);
  });

  test('422 — fecha inicio en el pasado', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ vehiculo_id: 1, fecha_inicio: '2020-01-01', fecha_fin: '2020-01-05' });
    expect(res.status).toBe(422);
  });

  test('422 — fecha inicio igual o mayor que fecha fin', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ vehiculo_id: 1, fecha_inicio: '2027-01-15', fecha_fin: '2027-01-10' });
    expect(res.status).toBe(422);
  });

  test('404 — vehiculo no existe', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send(payload);
    expect(res.status).toBe(404);
  });

  test('422 — vehiculo no disponible', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, propietario_id: 2, disponible: false }] });
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send(payload);
    expect(res.status).toBe(422);
  });

  test('422 — conflicto de fechas con reserva existente', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, propietario_id: 2, disponible: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 5 }] });
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send(payload);
    expect(res.status).toBe(422);
  });

  test('401 — sin token', async () => {
    const res = await request(app).post('/api/reservas').send(payload);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/reservas/mias ──────────────────────────────────────────────────

describe('GET /api/reservas/mias', () => {
  test('200 — conductor obtiene sus reservas', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, marca: 'Toyota', estado: 'pendiente' }] });
    const res = await request(app)
      .get('/api/reservas/mias')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('403 — propietario no puede ver reservas mias', async () => {
    const res = await request(app)
      .get('/api/reservas/mias')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(403);
  });

  test('401 — sin token', async () => {
    const res = await request(app).get('/api/reservas/mias');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/reservas/mis-vehiculos ─────────────────────────────────────────

describe('GET /api/reservas/mis-vehiculos', () => {
  test('200 — propietario obtiene reservas de sus vehiculos', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, marca: 'Toyota', conductor_nombre: 'Juan' }] });
    const res = await request(app)
      .get('/api/reservas/mis-vehiculos')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('403 — conductor no puede ver reservas de vehiculos', async () => {
    const res = await request(app)
      .get('/api/reservas/mis-vehiculos')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/reservas/:id ─────────────────────────────────────────────────

describe('PATCH /api/reservas/:id', () => {
  test('200 — propietario confirma reserva', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'confirmada' }] });
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ estado: 'confirmada' });
    expect(res.status).toBe(200);
    expect(res.body.reserva.estado).toBe('confirmada');
  });

  test('200 — propietario marca reserva en curso cuando ya esta pagada', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'confirmada' }] })
      // el pago existe: el arriendo puede empezar
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'en_curso' }] });
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ estado: 'en_curso' });
    expect(res.status).toBe(200);
    expect(res.body.reserva.estado).toBe('en_curso');
  });

  test('422 — no se puede iniciar el arriendo de una reserva sin pagar', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'confirmada' }] })
      // no hay pago registrado para la reserva
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ estado: 'en_curso' });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/no ha sido pagada/i);
  });

  test('la reserva sin pagar no se actualiza en la base', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'confirmada' }] })
      .mockResolvedValueOnce({ rows: [] });
    await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ estado: 'en_curso' });
    // solo la lectura de la reserva y la del pago: ningun UPDATE
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls.some(([sql]) => /UPDATE/i.test(sql))).toBe(false);
  });

  test('200 — propietario marca la devolucion (finalizada)', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'en_curso' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'finalizada' }] });
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ estado: 'finalizada' });
    expect(res.status).toBe(200);
    expect(res.body.reserva.estado).toBe('finalizada');
  });

  test('422 — transicion invalida (finalizar una reserva pendiente)', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente' }] });
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ estado: 'finalizada' });
    expect(res.status).toBe(422);
  });

  test('422 — no se puede cancelar una reserva ya finalizada', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'finalizada' }] });
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ estado: 'cancelada' });
    expect(res.status).toBe(422);
  });

  test('200 — conductor cancela su propia reserva', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'cancelada' }] });
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ estado: 'cancelada' });
    expect(res.status).toBe(200);
    expect(res.body.reserva.estado).toBe('cancelada');
  });

  test('403 — conductor no puede confirmar una reserva', async () => {
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ estado: 'confirmada' });
    expect(res.status).toBe(403);
  });

  test('422 — estado invalido', async () => {
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ estado: 'invalido' });
    expect(res.status).toBe(422);
  });

  test('404 — reserva no encontrada para propietario', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/reservas/99')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ estado: 'confirmada' });
    expect(res.status).toBe(404);
  });

  test('404 — reserva no pertenece al conductor', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/reservas/99')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ estado: 'cancelada' });
    expect(res.status).toBe(404);
  });

  test('401 — sin token', async () => {
    const res = await request(app).patch('/api/reservas/1').send({ estado: 'confirmada' });
    expect(res.status).toBe(401);
  });
});

// ─── Errores 500 (catch blocks) ───────────────────────────────────────────────

describe('Errores de base de datos — 500', () => {
  test('POST /api/reservas — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ vehiculo_id: 1, fecha_inicio: '2027-01-10', fecha_fin: '2027-01-15' });
    expect(res.status).toBe(500);
  });

  test('GET /api/reservas/mias — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/reservas/mias')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });

  test('GET /api/reservas/mis-vehiculos — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/reservas/mis-vehiculos')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(500);
  });

  test('PATCH /api/reservas/:id — 500 si DB falla al actualizar', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente' }] })
      .mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .patch('/api/reservas/1')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ estado: 'confirmada' });
    expect(res.status).toBe(500);
  });
});
