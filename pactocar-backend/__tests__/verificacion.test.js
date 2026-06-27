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

const tokenConductor = jwt.sign({ id: 3, rol_id: 3, verificado: false }, process.env.JWT_SECRET);
const tokenPropietario = jwt.sign({ id: 2, rol_id: 2, verificado: false }, process.env.JWT_SECRET);

afterEach(() => jest.clearAllMocks());

// ─── POST /api/verificacion ──────────────────────────────────────────────────

describe('POST /api/verificacion', () => {
  test('201 — conductor envia solicitud con licencia', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, usuario_id: 3, estado: 'pendiente' }] });
    const res = await request(app)
      .post('/api/verificacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({
        rut: '12345678-9',
        numero_licencia: 'A1-123456',
        clase_licencia: 'B',
        vencimiento_licencia: '2028-12-31',
      });
    expect(res.status).toBe(201);
    expect(res.body.solicitud.estado).toBe('pendiente');
  });

  test('201 — propietario envia solicitud con seguro', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, usuario_id: 2, estado: 'pendiente' }] });
    const res = await request(app)
      .post('/api/verificacion')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({
        rut: '12345678-9',
        aseguradora: 'HDI',
        numero_poliza: 'POL-2026-001',
        vencimiento_seguro: '2027-12-31',
      });
    expect(res.status).toBe(201);
    expect(res.body.solicitud).toHaveProperty('id');
  });

  test('400 — rut es obligatorio', async () => {
    const res = await request(app)
      .post('/api/verificacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ numero_licencia: 'A1-123456', clase_licencia: 'B', vencimiento_licencia: '2028-12-31' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/RUT/i);
  });

  test('400 — conductor sin datos de licencia', async () => {
    const res = await request(app)
      .post('/api/verificacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ rut: '12345678-9' });
    expect(res.status).toBe(400);
  });

  test('400 — propietario sin datos de seguro', async () => {
    const res = await request(app)
      .post('/api/verificacion')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ rut: '12345678-9' });
    expect(res.status).toBe(400);
  });

  test('401 — sin token', async () => {
    const res = await request(app)
      .post('/api/verificacion')
      .send({ rut: '12345678-9' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/verificacion/mia ───────────────────────────────────────────────

describe('GET /api/verificacion/mia', () => {
  test('200 — retorna solicitud existente', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, estado: 'pendiente', rut: '12345678-9' }] });
    const res = await request(app)
      .get('/api/verificacion/mia')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.body.solicitud).toHaveProperty('estado', 'pendiente');
  });

  test('200 — retorna null cuando no hay solicitud', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/verificacion/mia')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.body.solicitud).toBeNull();
  });

  test('401 — sin token', async () => {
    const res = await request(app).get('/api/verificacion/mia');
    expect(res.status).toBe(401);
  });
});

// ─── Errores 500 (catch blocks) ───────────────────────────────────────────────

describe('Errores de base de datos — 500', () => {
  test('POST /api/verificacion — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/verificacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ rut: '12345678-9', numero_licencia: 'A1-123456', clase_licencia: 'B', vencimiento_licencia: '2028-12-31' });
    expect(res.status).toBe(500);
  });

  test('GET /api/verificacion/mia — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/verificacion/mia')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});
