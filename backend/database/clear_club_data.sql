-- Script para limpiar solo los datos del Club San Jerónimo del Rey
-- Esto eliminará socios y tarjetas pero mantendrá el club y torneos

-- Primero verificar el ID del club
SELECT course_id, course_name FROM golf_courses WHERE course_name LIKE '%San%Jer%';

-- Luego ejecutaremos los DELETE según el ID encontrado

