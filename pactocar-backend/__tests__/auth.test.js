'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-pactocar';

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
  PutObjectCommand: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../index');
const db = require('../db');

const tokenUsuario = jwt.sign({ id: 1, rol_id: 2, verificado: true }, process.env.JWT_SECRET);

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

  test('422 — rechaza password menor a 8 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre_completo: 'Ana', email: 'ana@test.cl', password: 'corta', rol_id: 2 });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/8 caracteres/i);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('200 — devuelve token con credenciales válidas', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre_completo: 'Ana López', email: 'ana@test.cl', password_hash: hashValido, rol_id: 2, activo: true, verificado: true }],
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

  test('400 — rechaza body sin email o password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'solo@test.cl' });

    expect(res.status).toBe(400);
  });

  test('403 — rechaza usuario suspendido', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 2, email: 'suspendido@test.cl', password_hash: hashValido, rol_id: 3, activo: false }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'suspendido@test.cl', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/suspendido/i);
  });
});

// ─── Editar perfil ───────────────────────────────────────────────────────────

describe('PATCH /api/auth/perfil', () => {

  test('200 — actualiza nombre correctamente', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, password_hash: hashValido }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, nombre_completo: 'Nuevo Nombre', email: 'ana@test.cl', rol_id: 2 }] });

    const res = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send({ nombre_completo: 'Nuevo Nombre', password_actual: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.usuario.nombre_completo).toBe('Nuevo Nombre');
  });

  test('200 — actualiza nombre y password nueva', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, password_hash: hashValido }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, nombre_completo: 'Ana', email: 'ana@test.cl', rol_id: 2 }] });

    const res = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send({ nombre_completo: 'Ana', password_actual: 'password123', password_nueva: 'nueva_password456' });

    expect(res.status).toBe(200);
  });

  test('400 — faltan nombre o password actual', async () => {
    const res = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send({ nombre_completo: 'Solo nombre' });

    expect(res.status).toBe(400);
  });

  test('401 — password actual incorrecta', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, password_hash: hashValido }] });

    const res = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send({ nombre_completo: 'Ana', password_actual: 'incorrecta' });

    expect(res.status).toBe(401);
  });

  test('422 — nueva password menor a 8 caracteres', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, password_hash: hashValido }] });

    const res = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send({ nombre_completo: 'Ana', password_actual: 'password123', password_nueva: 'corta' });

    expect(res.status).toBe(422);
  });

  test('404 — usuario no existe en DB al editar perfil', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send({ nombre_completo: 'Ana', password_actual: 'password123' });
    expect(res.status).toBe(404);
  });

  test('401 — sin token', async () => {
    const res = await request(app)
      .patch('/api/auth/perfil')
      .send({ nombre_completo: 'Ana', password_actual: 'password123' });

    expect(res.status).toBe(401);
  });
});

// ─── Errores 500 (catch blocks) ───────────────────────────────────────────────

describe('Errores de base de datos — 500', () => {
  test('POST /api/auth/register — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre_completo: 'Ana', email: 'ana@test.cl', password: 'password123', rol_id: 2 });
    expect(res.status).toBe(500);
  });

  test('POST /api/auth/login — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@test.cl', password: 'password123' });
    expect(res.status).toBe(500);
  });

  test('PATCH /api/auth/perfil — 500 si DB falla al actualizar', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, password_hash: hashValido }] })
      .mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .patch('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenUsuario}`)
      .send({ nombre_completo: 'Ana', password_actual: 'password123' });
    expect(res.status).toBe(500);
  });
});

// ─── Vehiculos (sin token) ───────────────────────────────────────────────────

describe('GET /api/vehiculos/mios', () => {
  test('401 — rechaza petición sin token de autorización', async () => {
    const res = await request(app).get('/api/vehiculos/mios');

    expect(res.status).toBe(401);
  });
});
