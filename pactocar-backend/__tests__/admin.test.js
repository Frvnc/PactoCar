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

// ─── GET /api/admin/estadisticas ─────────────────────────────────────────────

describe('GET /api/admin/estadisticas', () => {
  test('200 — admin obtiene estadisticas del sistema', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ total_usuarios: '5', total_vehiculos: '3', reservas_pendientes: '2', reservas_confirmadas: '1' }],
    });
    const res = await request(app)
      .get('/api/admin/estadisticas')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_usuarios');
    expect(res.body).toHaveProperty('total_vehiculos');
  });

  test('403 — conductor no puede ver estadisticas', async () => {
    const res = await request(app)
      .get('/api/admin/estadisticas')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/admin/verificaciones ───────────────────────────────────────────

describe('GET /api/admin/verificaciones', () => {
  test('200 — admin obtiene solicitudes pendientes', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 1, usuario_id: 3, rut: '12345678-9', estado: 'pendiente', nombre_completo: 'Juan', email: 'juan@test.cl', rol_id: 3, rol_nombre: 'Conductor' },
      ],
    });
    const res = await request(app)
      .get('/api/admin/verificaciones')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('403 — no admin es rechazado', async () => {
    const res = await request(app)
      .get('/api/admin/verificaciones')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/admin/verificaciones/:id ─────────────────────────────────────

describe('PATCH /api/admin/verificaciones/:id', () => {
  test('200 — admin aprueba solicitud y verifica al usuario', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ usuario_id: 3 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/admin/verificaciones/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'aprobar' });
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/aprobada/i);
  });

  test('200 — admin rechaza solicitud con mensaje', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ usuario_id: 3 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/admin/verificaciones/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'rechazar', mensaje_rechazo: 'Documentacion invalida' });
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/rechazada/i);
  });

  test('422 — accion invalida', async () => {
    const res = await request(app)
      .patch('/api/admin/verificaciones/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'ignorar' });
    expect(res.status).toBe(422);
  });

  test('404 — solicitud no encontrada o ya procesada', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/admin/verificaciones/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'aprobar' });
    expect(res.status).toBe(404);
  });

  test('403 — no admin es rechazado', async () => {
    const res = await request(app)
      .patch('/api/admin/verificaciones/1')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ accion: 'aprobar' });
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/admin/fotos ─────────────────────────────────────────────────────

describe('GET /api/admin/fotos', () => {
  test('200 — admin obtiene fotos pendientes de aprobacion', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, marca: 'Toyota', modelo: 'Corolla', anio: 2022, patente: 'ABCD12', imagen_url: 'https://s3.test/foto.jpg', propietario_nombre: 'Ana' }],
    });
    const res = await request(app)
      .get('/api/admin/fotos')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('403 — no admin es rechazado', async () => {
    const res = await request(app)
      .get('/api/admin/fotos')
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/admin/fotos/:id ──────────────────────────────────────────────

describe('PATCH /api/admin/fotos/:id', () => {
  test('200 — admin aprueba foto', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .patch('/api/admin/fotos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'aprobar' });
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/aprobada/i);
  });

  test('200 — admin rechaza foto', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .patch('/api/admin/fotos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'rechazar' });
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/rechazada/i);
  });

  test('422 — accion invalida', async () => {
    const res = await request(app)
      .patch('/api/admin/fotos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'ignorar' });
    expect(res.status).toBe(422);
  });

  test('404 — vehiculo no encontrado', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/admin/fotos/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'aprobar' });
    expect(res.status).toBe(404);
  });

  test('403 — no admin es rechazado', async () => {
    const res = await request(app)
      .patch('/api/admin/fotos/1')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ accion: 'aprobar' });
    expect(res.status).toBe(403);
  });
});

// ─── Errores 500 (catch blocks) ───────────────────────────────────────────────

describe('Errores de base de datos — 500', () => {
  test('GET /api/admin/usuarios — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/admin/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(500);
  });

  test('PATCH /api/admin/usuarios/:id — 404 si usuario no existe', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/admin/usuarios/99')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ activo: true });
    expect(res.status).toBe(404);
  });

  test('GET /api/admin/estadisticas — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/admin/estadisticas')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(500);
  });

  test('GET /api/admin/verificaciones — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/admin/verificaciones')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(500);
  });

  test('PATCH /api/admin/verificaciones/:id — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .patch('/api/admin/verificaciones/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'aprobar' });
    expect(res.status).toBe(500);
  });

  test('GET /api/admin/fotos — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .get('/api/admin/fotos')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(500);
  });

  test('PATCH /api/admin/fotos/:id — 500 si DB falla', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .patch('/api/admin/fotos/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'aprobar' });
    expect(res.status).toBe(500);
  });
});
