-- Run this script BEFORE the migration to create the database with the correct encoding.
-- Connect to the default 'postgres' database first:
--   psql -U postgres -f db/create_db.sql
--
-- Or run the individual statement manually in psql / pgAdmin:
--   \connect postgres

DROP DATABASE IF EXISTS pulse_chat;

CREATE DATABASE pulse_chat
  ENCODING    'UTF8'
  LC_COLLATE  'en-US'
  LC_CTYPE    'en-US'
  TEMPLATE    template0;
