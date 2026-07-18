'use strict';

jest.mock('../db', () => ({ query: jest.fn() }));

const bcrypt = require('bcryptjs');
const db = require('../db');
const asegurarAdmin = require('../bootstrap-admin');

const ENV_ORIGINAL = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ADMIN_EMAIL = 'admin@pactocar.cl';
  process.env.ADMIN_PASSWORD = 'clave-de-prueba';
});

afterEach(() => {
  process.env = { ...ENV_ORIGINAL };
});

describe('bootstrap del administrador', () => {
  test('crea el admin cuando la base no tiene ninguno', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const resultado = await asegurarAdmin();

    expect(resultado.creado).toBe(true);
    expect(db.query).toHaveBeenCalledTimes(2);

    const [sql, valores] = db.query.mock.calls[1];
    expect(sql).toContain('INSERT INTO usuarios');
    expect(valores[0]).toBe('Administrador');
    expect(valores[1]).toBe('admin@pactocar.cl');
    // La contrasena nunca se guarda en claro
    expect(valores[2]).not.toBe('clave-de-prueba');
    await expect(bcrypt.compare('clave-de-prueba', valores[2])).resolves.toBe(true);
  });

  test('normaliza el correo a minusculas y sin espacios', async () => {
    process.env.ADMIN_EMAIL = '  ADMIN@PactoCar.CL  ';
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await asegurarAdmin();

    expect(db.query.mock.calls[1][1][1]).toBe('admin@pactocar.cl');
  });

  test('no crea nada si ya existe un administrador', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const resultado = await asegurarAdmin();

    expect(resultado.creado).toBe(false);
    expect(resultado.motivo).toBe('ya existe un administrador');
    // Solo la consulta de comprobacion, ningun INSERT
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('no hace nada si falta ADMIN_EMAIL', async () => {
    delete process.env.ADMIN_EMAIL;

    const resultado = await asegurarAdmin();

    expect(resultado.creado).toBe(false);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('no hace nada si falta ADMIN_PASSWORD', async () => {
    delete process.env.ADMIN_PASSWORD;

    const resultado = await asegurarAdmin();

    expect(resultado.creado).toBe(false);
    expect(db.query).not.toHaveBeenCalled();
  });
});
