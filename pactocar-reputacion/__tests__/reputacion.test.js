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

const reservaFinalizada = { id: 10, estado: 'finalizada', conductor_id: 3, propietario_id: 2 };

afterEach(() => jest.clearAllMocks());

// ─── POST /api/reputacion ────────────────────────────────────────────────────

describe('POST /api/reputacion', () => {
  test('201 — el conductor califica al propietario tras finalizar', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [reservaFinalizada] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10, autor_id: 3, destinatario_id: 2, puntaje: 5, comentario: 'Todo ok' }] });

    const res = await request(app)
      .post('/api/reputacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10, puntaje: 5, comentario: 'Todo ok' });

    expect(res.status).toBe(201);
    expect(res.body.calificacion.destinatario_id).toBe(2);
    // el destinatario se calcula como la contraparte del autor
    const insertArgs = db.query.mock.calls[2][1];
    expect(insertArgs[2]).toBe(2);
  });

  test('201 — el propietario califica al conductor', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [reservaFinalizada] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 2, reserva_id: 10, autor_id: 2, destinatario_id: 3, puntaje: 4 }] });

    const res = await request(app)
      .post('/api/reputacion')
      .set('Authorization', `Bearer ${tokenPropietario}`)
      .send({ reserva_id: 10, puntaje: 4 });

    expect(res.status).toBe(201);
    const insertArgs = db.query.mock.calls[2][1];
    expect(insertArgs[2]).toBe(3);
  });

  test('400 — faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/reputacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10 });
    expect(res.status).toBe(400);
  });

  test('422 — puntaje fuera del rango 1-5', async () => {
    const res = await request(app)
      .post('/api/reputacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10, puntaje: 7 });
    expect(res.status).toBe(422);
  });

  test('404 — reserva no existe', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/reputacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 99, puntaje: 5 });
    expect(res.status).toBe(404);
  });

  test('403 — la reserva es de terceros', async () => {
    db.query.mockResolvedValueOnce({ rows: [reservaFinalizada] });
    const res = await request(app)
      .post('/api/reputacion')
      .set('Authorization', `Bearer ${tokenAjeno}`)
      .send({ reserva_id: 10, puntaje: 5 });
    expect(res.status).toBe(403);
  });

  test('422 — la reserva no esta finalizada', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ ...reservaFinalizada, estado: 'en_curso' }] });
    const res = await request(app)
      .post('/api/reputacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10, puntaje: 5 });
    expect(res.status).toBe(422);
  });

  test('409 — el usuario ya califico esta reserva', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [reservaFinalizada] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .post('/api/reputacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10, puntaje: 5 });
    expect(res.status).toBe(409);
  });

  test('401 — sin token', async () => {
    const res = await request(app).post('/api/reputacion').send({ reserva_id: 10, puntaje: 5 });
    expect(res.status).toBe(401);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/reputacion')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: 10, puntaje: 5 });
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/reputacion/usuario/:usuarioId ──────────────────────────────────

describe('GET /api/reputacion/usuario/:usuarioId', () => {
  test('200 — devuelve promedio, total y detalle', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total: 2, promedio: '4.50' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, puntaje: 5 }, { id: 2, puntaje: 4 }] });
    const res = await request(app)
      .get('/api/reputacion/usuario/2')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.body.promedio).toBe(4.5);
    expect(res.body.total).toBe(2);
    expect(res.body.calificaciones).toHaveLength(2);
  });

  test('200 — usuario sin calificaciones devuelve promedio 0', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total: 0, promedio: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/reputacion/usuario/5')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(res.body.promedio).toBe(0);
    expect(res.body.total).toBe(0);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/reputacion/usuario/2')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/reputacion/mias ────────────────────────────────────────────────

describe('GET /api/reputacion/mias', () => {
  test('200 — devuelve las calificaciones emitidas por el usuario', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10, destinatario_id: 2, puntaje: 5 }] });
    const res = await request(app)
      .get('/api/reputacion/mias')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/reputacion/mias')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/reputacion/reserva/:reservaId ──────────────────────────────────

describe('GET /api/reputacion/reserva/:reservaId', () => {
  test('200 — devuelve las calificaciones de una reserva', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, reserva_id: 10, autor_id: 3, puntaje: 5 }] });
    const res = await request(app)
      .get('/api/reputacion/reserva/10')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('500 — si la DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/reputacion/reserva/10')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(500);
  });
});
