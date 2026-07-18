'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-pactocar';

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../utils/contrato-pdf', () => ({
  generarContratoPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 contrato de prueba')),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const db = require('../db');

const tokenConductor = jwt.sign({ id: 3, rol_id: 3, verificado: true }, process.env.JWT_SECRET);
const tokenPropietario = jwt.sign({ id: 2, rol_id: 2, verificado: true }, process.env.JWT_SECRET);
const tokenAjeno = jwt.sign({ id: 9, rol_id: 3, verificado: true }, process.env.JWT_SECRET);

const reservaBase = {
  id: 10,
  fecha_inicio: '2027-01-10',
  fecha_fin: '2027-01-15',
  monto_total: 100000,
  estado: 'confirmada',
  conductor_id: 3,
  propietario_id: 2,
  marca: 'Toyota',
  modelo: 'Corolla',
  anio: 2022,
  patente: 'ABCD12',
  arrendador: 'Carlos Mendoza',
  arrendatario: 'Maria Gonzalez',
};

afterEach(() => jest.clearAllMocks());

// ─── POST /api/contratos ─────────────────────────────────────────────────────

describe('POST /api/contratos', () => {
  test('201 — el conductor genera el contrato de su reserva confirmada', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [reservaBase] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10, arrendador: 'Carlos Mendoza', arrendatario: 'Maria Gonzalez', vehiculo: 'Toyota Corolla 2022 (ABCD12)', monto: 100000, fecha_inicio: '2027-01-10', fecha_fin: '2027-01-15' }] });

    const res = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });

    expect(res.status).toBe(201);
    expect(res.body.contrato).toHaveProperty('id');
    // el PDF no debe viajar en el cuerpo del INSERT devuelto
    expect(res.body.contrato).not.toHaveProperty('pdf');
  });

  test('201 — el propietario tambien puede generar el contrato', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [reservaBase] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10 }] });

    const res = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ reserva_id: 10 });

    expect(res.status).toBe(201);
  });

  test('400 — falta el id de la reserva', async () => {
    const res = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('404 — reserva no existe', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 99 });
    expect(res.status).toBe(404);
  });

  test('403 — la reserva es de terceros', async () => {
    db.query.mockResolvedValueOnce({ rows: [reservaBase] });
    const res = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${tokenAjeno}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(403);
  });

  test('422 — la reserva aun esta pendiente', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...reservaBase, estado: 'pendiente' }] });
    const res = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(422);
  });

  test('409 — la reserva ya tiene contrato', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [reservaBase] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(409);
  });

  test('401 — sin token', async () => {
    const res = await request(app).post('/api/contratos').send({ reserva_id: 10 });
    expect(res.status).toBe(401);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/contratos/mios ─────────────────────────────────────────────────

describe('GET /api/contratos/mios', () => {
  test('200 — devuelve los contratos del usuario', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10, vehiculo: 'Toyota Corolla 2022 (ABCD12)' }] });
    const res = await request(app)
      .get('/api/contratos/mios')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/contratos/mios')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/contratos/reserva/:reservaId ───────────────────────────────────

describe('GET /api/contratos/reserva/:reservaId', () => {
  test('200 — devuelve el contrato de la reserva', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10 }] });
    const res = await request(app)
      .get('/api/contratos/reserva/10')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.body.contrato).toHaveProperty('reserva_id', 10);
  });

  test('200 — null si la reserva no tiene contrato', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/contratos/reserva/99')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.body.contrato).toBeNull();
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/contratos/reserva/10')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/contratos/:id/pdf ──────────────────────────────────────────────

describe('GET /api/contratos/:id/pdf', () => {
  test('200 — descarga el PDF del contrato', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ pdf: Buffer.from('%PDF-1.4 contrato'), reserva_id: 10 }] });
    const res = await request(app)
      .get('/api/contratos/1/pdf')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  test('404 — contrato no encontrado o no pertenece al usuario', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/contratos/99/pdf')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(404);
  });

  test('401 — sin token', async () => {
    const res = await request(app).get('/api/contratos/1/pdf');
    expect(res.status).toBe(401);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/contratos/1/pdf')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});
