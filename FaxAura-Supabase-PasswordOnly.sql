-- Fax Aura: login con contraseña única, sin usuario ni key visible
-- Ejecuta este script en Supabase > SQL Editor.

create extension if not exists pgcrypto;

alter table public."Aura"
  add column if not exists password_hash text;

-- Define la contraseña de acceso en una fila activa de Aura.
-- Sustituye TU_CONTRASEÑA por la contraseña que quieras usar:
update public."Aura"
set password_hash = encode(digest('TU_CONTRASEÑA', 'sha256'), 'hex')
where id = 1;

-- La app busca el hash en Aura y conserva la expiración,
-- el estado y la vinculación del dispositivo de esa fila.
-- Para cambiar la contraseña, vuelve a ejecutar el UPDATE con otro valor.
