'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-pactocar';

jest.mock('../db', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const db = require('../db');

const tokenConductor = jwt.sign({ id: 3, rol_id: 3, verificado: true }, process.env.JWT_SECRET);
const tokenPropietario = jwt.sign({ id: 2, rol_id: 2, verificado: true }, process.env.JWT_SECRET);
const tokenAjeno = jwt.sign({ id: 9, rol_id: 3, verificado: true }, process.env.JWT_SECRET);

const reservaActiva = { id: 10, estado: 'confirmada', conductor_id: 3, propietario_id: 2 };

afterEach(() => jest.clearAllMocks());

// ─── POST /api/chat/:reservaId ───────────────────────────────────────────────

describe('POST /api/chat/:reservaId', () => {
  test('201 — un participante envia un mensaje', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [reservaActiva] })
      .mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10, emisor_id: 3, contenido: 'Hola, coordinamos la entrega?' }] });

    const res = await request(app)
      .post('/api/chat/10')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ contenido: 'Hola, coordinamos la entrega?' });

    expect(res.status).toBe(201);
    expect(res.body.mensaje).toHaveProperty('id');
  });

  test('400 — contenido vacio', async () => {
    const res = await request(app)
      .post('/api/chat/10')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ contenido: '   ' });
    expect(res.status).toBe(400);
  });

  test('422 — mensaje demasiado largo', async () => {
    const res = await request(app)
      .post('/api/chat/10')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ contenido: 'a'.repeat(1001) });
    expect(res.status).toBe(422);
  });

  test('404 — reserva no existe', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/chat/99')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ contenido: 'Hola' });
    expect(res.status).toBe(404);
  });

  test('403 — el usuario no participa en la reserva', async () => {
    db.query.mockResolvedValueOnce({ rows: [reservaActiva] });
    const res = await request(app)
      .post('/api/chat/10')
      .set('Authorization', `Bearer ${tokenAjeno}`)
      .send({ contenido: 'Hola' });
    expect(res.status).toBe(403);
  });

  test('422 — no se puede escribir en una reserva cancelada', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...reservaActiva, estado: 'cancelada' }] });
    const res = await request(app)
      .post('/api/chat/10')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ contenido: 'Hola' });
    expect(res.status).toBe(422);
  });

  test('401 — sin token', async () => {
    const res = await request(app).post('/api/chat/10').send({ contenido: 'Hola' });
    expect(res.status).toBe(401);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/chat/10')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ contenido: 'Hola' });
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/chat/:reservaId ────────────────────────────────────────────────

describe('GET /api/chat/:reservaId', () => {
  test('200 — un participante lee los mensajes (con nombre del emisor)', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [reservaActiva] })
      .mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10, emisor_id: 3, emisor_nombre: 'Maria Gonzalez', contenido: 'Hola', creado_en: '2027-01-11T10:00:00Z' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/chat/10')
      .set('Authorization', `Bearer ${tokenPropietario}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('emisor_nombre', 'Maria Gonzalez');
  });

  test('404 — reserva no existe', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/chat/99')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(404);
  });

  test('403 — el usuario no participa en la reserva', async () => {
    db.query.mockResolvedValueOnce({ rows: [reservaActiva] });
    const res = await request(app)
      .get('/api/chat/10')
      .set('Authorization', `Bearer ${tokenAjeno}`);
    expect(res.status).toBe(403);
  });

  test('401 — sin token', async () => {
    const res = await request(app).get('/api/chat/10');
    expect(res.status).toBe(401);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/chat/10')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/chat ───────────────────────────────────────────────────────────

describe('GET /api/chat', () => {
  test('200 — devuelve el resumen de conversaciones con no leidos', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ reserva_id: 10, total_mensajes: 3, ultimo: '2027-01-11T10:00:00Z', no_leidos: 2 }] });
    const res = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('no_leidos', 2);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/chat')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});
