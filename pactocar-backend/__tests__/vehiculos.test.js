'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-pactocar';
process.env.S3_BUCKET_NAME = 'pactocar-fotos-test';
process.env.AWS_REGION = 'us-east-1';

jest.mock('../db', () => ({ query: jest.fn() }));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn().mockImplementation((params) => params),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const db = require('../db');

const tokenPropietario = jwt.sign({ id: 2, rol_id: 2, verificado: true }, process.env.JWT_SECRET);
const tokenConductor = jwt.sign({ id: 3, rol_id: 3, verificado: true }, process.env.JWT_SECRET);

afterEach(() => jest.clearAllMocks());

// ─── GET /api/vehiculos (catalogo publico) ────────────────────────────────────

describe('GET /api/vehiculos', () => {
  test('200 — retorna lista de vehiculos disponibles', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, marca: 'Toyota', modelo: 'Corolla', disponible: true, propietario_nombre: 'Ana' }],
    });
    const res = await request(app).get('/api/vehiculos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].marca).toBe('Toyota');
  });
});

// ─── POST /api/vehiculos ──────────────────────────────────────────────────────

describe('POST /api/vehiculos', () => {
  const payload = { marca: 'Toyota', modelo: 'Corolla', anio: 2022, patente: 'ABCD12', precio_diario_clp: 25000 };

  test('201 — propietario publica vehiculo', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, ...payload, propietario_id: 2, disponible: true }] });
    const res = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.vehiculo).toHaveProperty('id');
  });

  test('403 — conductor no puede publicar vehiculo', async () => {
    const res = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send(payload);
    expect(res.status).toBe(403);
  });

  test('400 — faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ marca: 'Toyota' });
    expect(res.status).toBe(400);
  });

  test('422 — anio fuera de rango', async () => {
    const res = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ ...payload, anio: 1800 });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/año/i);
  });

  test('422 — precio diario negativo', async () => {
    const res = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ ...payload, precio_diario_clp: -5000 });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/precio/i);
  });

  test('400 — patente duplicada', async () => {
    const err = new Error('duplicate key');
    err.code = '23505';
    db.query.mockRejectedValueOnce(err);
    const res = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/patente/i);
  });

  test('401 — sin token', async () => {
    const res = await request(app).post('/api/vehiculos').send(payload);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/vehiculos/mios ──────────────────────────────────────────────────

describe('GET /api/vehiculos/mios', () => {
  test('200 — propietario obtiene sus vehiculos', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, marca: 'Toyota', propietario_id: 2 }] });
    const res = await request(app)
      .get('/api/vehiculos/mios')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('403 — conductor no puede ver vehiculos mios', async () => {
    const res = await request(app)
      .get('/api/vehiculos/mios')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/vehiculos/:id/disponible ─────────────────────────────────────

describe('PATCH /api/vehiculos/:id/disponible', () => {
  test('200 — propietario desactiva vehiculo', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, disponible: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, disponible: false }] });
    const res = await request(app)
      .patch('/api/vehiculos/1/disponible')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.vehiculo.disponible).toBe(false);
  });

  test('200 — propietario activa vehiculo', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, disponible: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, disponible: true }] });
    const res = await request(app)
      .patch('/api/vehiculos/1/disponible')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.vehiculo.disponible).toBe(true);
  });

  test('403 — conductor no puede cambiar disponibilidad', async () => {
    const res = await request(app)
      .patch('/api/vehiculos/1/disponible')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({});
    expect(res.status).toBe(403);
  });

  test('404 — vehiculo no encontrado o no pertenece al propietario', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/vehiculos/99/disponible')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({});
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/vehiculos/foto ─────────────────────────────────────────────────

describe('POST /api/vehiculos/foto', () => {
  test('200 — propietario sube foto y obtiene URL de S3', async () => {
    const res = await request(app)
      .post('/api/vehiculos/foto')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .attach('foto', Buffer.from('fake-image-content'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body.url).toContain('s3');
  });

  test('400 — no se envio ningun archivo', async () => {
    const res = await request(app)
      .post('/api/vehiculos/foto')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(400);
  });

  test('400 — archivo que no es imagen es rechazado', async () => {
    const res = await request(app)
      .post('/api/vehiculos/foto')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .attach('foto', Buffer.from('not-an-image'), {
        filename: 'document.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(400);
  });

  test('401 — sin token', async () => {
    const res = await request(app).post('/api/vehiculos/foto');
    expect(res.status).toBe(401);
  });

  test('400 — imagen mayor a 5 MB es rechazada', async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024);
    const res = await request(app)
      .post('/api/vehiculos/foto')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .attach('foto', bigBuffer, { filename: 'grande.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });


});

// ─── Errores 500 (catch blocks) ───────────────────────────────────────────────

describe('Errores de base de datos — 500', () => {
  test('GET /api/vehiculos — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/vehiculos');
    expect(res.status).toBe(500);
  });

  test('POST /api/vehiculos — 500 si DB falla (error generico)', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ marca: 'Toyota', modelo: 'Corolla', anio: 2022, patente: 'ABCD12', precio_diario_clp: 25000 });
    expect(res.status).toBe(500);
  });

  test('GET /api/vehiculos/mios — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/vehiculos/mios')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(500);
  });

  test('PATCH /api/vehiculos/:id/disponible — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .patch('/api/vehiculos/1/disponible')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({});
    expect(res.status).toBe(500);
  });
});
