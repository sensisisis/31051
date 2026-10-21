-- Fax Aura: contraseña individual por key
-- Ejecuta este script en Supabase > SQL Editor.

alter table public."Aura"
  add column if not exists password_hash text;

-- password_hash debe contener el SHA-256 en hexadecimal de la contraseña.
-- La IPA nunca recibe ni guarda la contraseña en texto plano.
-- Ejemplo para establecer una contraseña desde SQL usando pgcrypto:
--   update public."Aura"
--   set password_hash = encode(digest('TU_CONTRASEÑA', 'sha256'), 'hex')
--   where id = 1;

create extension if not exists pgcrypto;

-- Después de rellenar las contraseñas, comprueba que no haya keys sin contraseña:
-- select id, key_hash, status, expires_at, password_hash is not null as has_password
-- from public."Aura"
-- order by id desc;
