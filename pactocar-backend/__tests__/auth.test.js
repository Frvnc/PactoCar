'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-pactocar';

jest.mock('../db', () => ({ query: jest.fn() }));

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../index');
const db = require('../db');

let hashValido;

beforeAll(async () => {
  hashValido = await bcrypt.hash('password123', 10);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Register ───────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('201 — registra usuario con datos válidos', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, nombre_completo: 'Ana López', email: 'ana@test.cl', rol_id: 2, activo: true }],
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre_completo: 'Ana López', email: 'ana@test.cl', password: 'password123', rol_id: 2 });

    expect(res.status).toBe(201);
    expect(res.body.usuario.email).toBe('ana@test.cl');
  });

  test('400 — rechaza email ya registrado', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre_completo: 'Dup', email: 'dup@test.cl', password: 'password123', rol_id: 3 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/registrado/i);
  });

  test('422 — rechaza rol_id inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre_completo: 'X', email: 'x@test.cl', password: 'password123', rol_id: 99 });

    expect(res.status).toBe(422);
  });

  test('400 — rechaza body incompleto', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'incompleto@test.cl' });

    expect(res.status).toBe(400);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('200 — devuelve token con credenciales válidas', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre_completo: 'Ana López', email: 'ana@test.cl', password_hash: hashValido, rol_id: 2, activo: true }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@test.cl', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario.rol_id).toBe(2);
  });

  test('401 — rechaza contraseña incorrecta', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'ana@test.cl', password_hash: hashValido, rol_id: 2, activo: true }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@test.cl', password: 'contraseña_incorrecta' });

    expect(res.status).toBe(401);
  });

  test('401 — rechaza usuario inexistente', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.cl', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

// ─── Vehiculos (sin token) ───────────────────────────────────────────────────

describe('GET /api/vehiculos/mios', () => {
  test('401 — rechaza petición sin token de autorización', async () => {
    const res = await request(app).get('/api/vehiculos/mios');

    expect(res.status).toBe(401);
  });
});
