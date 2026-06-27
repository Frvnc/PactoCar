'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-pactocar';

jest.mock('../db', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const db = require('../db');

const tokenAdmin = jwt.sign({ id: 1, rol_id: 1, verificado: true }, process.env.JWT_SECRET);
const tokenConductor = jwt.sign({ id: 3, rol_id: 3, verificado: true }, process.env.JWT_SECRET);

afterEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/admin/usuarios ─────────────────────────────────────────────────

describe('GET /api/admin/usuarios', () => {
  test('200 — admin obtiene lista de usuarios', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre_completo: 'Admin', email: 'admin@test.cl', rol_id: 1, activo: true, verificado: true, rol_nombre: 'Administrador' },
        { id: 2, nombre_completo: 'Juan', email: 'juan@test.cl', rol_id: 3, activo: true, verificado: false, rol_nombre: 'Conductor' },
      ],
    });

    const res = await request(app)
      .get('/api/admin/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).not.toHaveProperty('password_hash');
  });

  test('403 — conductor no puede acceder a admin', async () => {
    const res = await request(app)
      .get('/api/admin/usuarios')
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(res.status).toBe(403);
  });

  test('401 — sin token es rechazado', async () => {
    const res = await request(app).get('/api/admin/usuarios');
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/admin/usuarios/:id ───────────────────────────────────────────

describe('PATCH /api/admin/usuarios/:id', () => {
  test('200 — admin verifica usuario', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 2, nombre_completo: 'Juan', email: 'juan@test.cl', rol_id: 3, activo: true, verificado: true }],
    });

    const res = await request(app)
      .patch('/api/admin/usuarios/2')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ verificado: true });

    expect(res.status).toBe(200);
    expect(res.body.usuario.verificado).toBe(true);
  });

  test('200 — admin suspende usuario', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 2, nombre_completo: 'Juan', email: 'juan@test.cl', rol_id: 3, activo: false, verificado: false }],
    });

    const res = await request(app)
      .patch('/api/admin/usuarios/2')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.usuario.activo).toBe(false);
  });

  test('400 — admin no puede modificar su propia cuenta', async () => {
    const res = await request(app)
      .patch('/api/admin/usuarios/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ activo: false });

    expect(res.status).toBe(400);
  });

  test('400 — sin campos que actualizar', async () => {
    const res = await request(app)
      .patch('/api/admin/usuarios/2')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test('422 — rol invalido', async () => {
    const res = await request(app)
      .patch('/api/admin/usuarios/2')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol_id: 99 });

    expect(res.status).toBe(422);
  });

  test('403 — conductor no puede usar endpoint admin', async () => {
    const res = await request(app)
      .patch('/api/admin/usuarios/3')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ activo: false });

    expect(res.status).toBe(403);
  });
});
