-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: teetracker_pro
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `course_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `user_type` enum('admin','member') COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_action` (`action`),
  KEY `idx_entity_type` (`entity_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `golf_courses` (`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=274 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
INSERT INTO `activity_logs` VALUES (1,1,NULL,'admin','participant_added','tournament',5,'{\"message\": \"Participante \\\"Jose Perez\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Jose Perez\"}',NULL,NULL,'2025-08-19 17:00:24'),(2,1,NULL,'admin','participant_added','tournament',5,'{\"message\": \"Participante \\\"Pepe Mujica\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Pepe Mujica\"}',NULL,NULL,'2025-08-19 17:02:41'),(3,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 1\", \"new_group\": 1, \"participation_id\": 3}',NULL,NULL,'2025-08-19 18:44:26'),(4,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"new_group\": 3, \"participation_id\": 3}',NULL,NULL,'2025-08-19 18:44:38'),(5,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"new_group\": 3, \"participation_id\": 3}',NULL,NULL,'2025-08-19 18:48:12'),(6,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"new_group\": 2, \"participation_id\": 3}',NULL,NULL,'2025-08-19 18:48:15'),(7,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"new_group\": 2, \"participation_id\": 1}',NULL,NULL,'2025-08-19 18:48:19'),(8,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 1\", \"new_group\": 1, \"participation_id\": 1}',NULL,NULL,'2025-08-19 18:48:25'),(9,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"new_group\": 3, \"participation_id\": 4}',NULL,NULL,'2025-08-19 18:48:28'),(10,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"new_group\": 2, \"participation_id\": 4}',NULL,NULL,'2025-08-19 18:48:31'),(11,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"new_group\": 3, \"participation_id\": 5}',NULL,NULL,'2025-08-19 18:48:34'),(12,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"new_group\": 2, \"participation_id\": 5}',NULL,NULL,'2025-08-19 18:48:37'),(13,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"new_group\": 3, \"participation_id\": 1}',NULL,NULL,'2025-08-19 19:36:30'),(14,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"08:12:00\", \"new_group\": 2, \"starting_hole\": 2, \"participation_id\": 1}',NULL,NULL,'2025-08-19 19:39:42'),(15,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 1\", \"tee_time\": \"08:00:00\", \"new_group\": 1, \"starting_hole\": 1, \"participation_id\": 1}',NULL,NULL,'2025-08-19 19:39:45'),(16,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"08:24:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 7}',NULL,NULL,'2025-08-19 19:39:55'),(17,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"08:24:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 4}',NULL,NULL,'2025-08-19 19:39:59'),(18,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"08:24:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 5}',NULL,NULL,'2025-08-19 19:48:52'),(19,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"08:24:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 5}',NULL,NULL,'2025-08-19 19:55:27'),(20,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"08:12:00\", \"new_group\": 2, \"starting_hole\": 2, \"participation_id\": 2}',NULL,NULL,'2025-08-19 23:10:46'),(21,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"08:24:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 6}',NULL,NULL,'2025-08-20 10:26:49'),(22,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 1\", \"tee_time\": \"08:00:00\", \"new_group\": 1, \"starting_hole\": 1, \"participation_id\": 6}',NULL,NULL,'2025-08-20 10:34:07'),(23,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"08:24:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 2}',NULL,NULL,'2025-08-20 10:38:27'),(24,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"08:24:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 2}',NULL,NULL,'2025-08-20 10:38:37'),(25,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"08:24:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 5}',NULL,NULL,'2025-08-20 10:38:39'),(26,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"08:24:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 5}',NULL,NULL,'2025-08-20 10:38:42'),(27,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"08:12:00\", \"new_group\": 2, \"starting_hole\": 2, \"participation_id\": 7}',NULL,NULL,'2025-08-20 10:38:48'),(28,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 1\", \"tee_time\": null, \"new_group\": 1, \"starting_hole\": 1, \"participation_id\": 1}',NULL,NULL,'2025-08-20 11:16:18'),(29,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": null, \"new_group\": 2, \"starting_hole\": 1, \"participation_id\": 1}',NULL,NULL,'2025-08-20 11:16:25'),(30,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 1\", \"tee_time\": null, \"new_group\": 1, \"starting_hole\": 1, \"participation_id\": 4}',NULL,NULL,'2025-08-20 11:40:00'),(31,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 1\", \"tee_time\": null, \"new_group\": 1, \"starting_hole\": 1, \"participation_id\": 7}',NULL,NULL,'2025-08-20 11:40:01'),(32,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": null, \"new_group\": 2, \"starting_hole\": 1, \"participation_id\": 2}',NULL,NULL,'2025-08-20 12:58:26'),(33,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"08:00:00\", \"new_group\": 2, \"starting_hole\": 2, \"participation_id\": 2}',NULL,NULL,'2025-08-20 14:46:54'),(34,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": null, \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 2}',NULL,NULL,'2025-08-20 15:32:41'),(35,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"13:00:00\", \"new_group\": 2, \"starting_hole\": 2, \"participation_id\": 2}',NULL,NULL,'2025-08-20 21:22:02'),(36,1,NULL,'admin','group_moved','tournament',5,'{\"message\": \"Grupo 2 movido al hoyo 3\", \"group_number\": 2, \"new_tee_time\": null, \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-20 21:22:41'),(37,1,NULL,'admin','group_moved','tournament',5,'{\"message\": \"Grupo 2 movido al hoyo 3\", \"group_number\": 2, \"new_tee_time\": null, \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-20 21:22:48'),(38,1,NULL,'admin','group_moved','tournament',5,'{\"message\": \"Grupo 2 movido al hoyo 3 con horario 13:01\", \"group_number\": 2, \"new_tee_time\": \"13:01\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-20 21:32:16'),(39,1,NULL,'admin','group_moved','tournament',5,'{\"message\": \"Grupo 2 movido al hoyo 3 con horario 14:01\", \"group_number\": 2, \"new_tee_time\": \"14:01\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-20 21:32:49'),(40,1,NULL,'admin','group_moved','tournament',5,'{\"message\": \"Grupo 2 movido al hoyo 3 con horario 14:59\", \"group_number\": 2, \"new_tee_time\": \"14:59\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-20 21:32:55'),(41,1,NULL,'admin','group_moved','tournament',5,'{\"message\": \"Grupo 2 movido al hoyo 3 con horario 14:00\", \"group_number\": 2, \"new_tee_time\": \"14:00\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-20 21:32:56'),(42,1,NULL,'admin','group_moved','tournament',5,'{\"message\": \"Grupo 2 movido al hoyo 3\", \"group_number\": 2, \"new_tee_time\": null, \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-20 21:36:54'),(43,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": null, \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 6}',NULL,NULL,'2025-08-20 22:01:36'),(44,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"14:00:00\", \"new_group\": 2, \"starting_hole\": 2, \"participation_id\": 6}',NULL,NULL,'2025-08-20 22:03:41'),(45,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"14:31:00\", \"new_group\": 3, \"starting_hole\": 1, \"participation_id\": 6}',NULL,NULL,'2025-08-20 23:32:26'),(46,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"14:52:00\", \"new_group\": 3, \"starting_hole\": 1, \"participation_id\": 6}',NULL,NULL,'2025-08-21 02:53:14'),(47,1,NULL,'admin','groups_renumbered','tournament',5,'{\"group1\": 3, \"group2\": 2, \"message\": \"Grupos renumerados: 3 ↔ 2\"}',NULL,NULL,'2025-08-21 02:55:36'),(48,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"22:55:00\", \"new_group\": 2, \"starting_hole\": 1, \"participation_id\": 6}',NULL,NULL,'2025-08-21 02:55:47'),(49,1,NULL,'admin','groups_renumbered','tournament',5,'{\"group1\": 3, \"group2\": 2, \"message\": \"Grupos renumerados: 3 ↔ 2\"}',NULL,NULL,'2025-08-21 02:55:50'),(50,1,NULL,'admin','groups_renumbered','tournament',5,'{\"group1\": 2, \"group2\": 3, \"message\": \"Grupos renumerados: 2 ↔ 3\"}',NULL,NULL,'2025-08-21 02:55:52'),(51,1,NULL,'admin','player_moved','tournament',5,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"14:00:00\", \"new_group\": 3, \"starting_hole\": 2, \"participation_id\": 6}',NULL,NULL,'2025-08-21 02:56:09'),(52,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Leguizamon Alberto\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Leguizamon Alberto\"}',NULL,NULL,'2025-08-25 21:49:02'),(53,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Basabilbaso Ariel\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Basabilbaso Ariel\"}',NULL,NULL,'2025-08-25 21:49:02'),(54,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"ARIEL BASABILBASO\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"ARIEL BASABILBASO\"}',NULL,NULL,'2025-08-25 21:49:02'),(55,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Prado Cesar\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Prado Cesar\"}',NULL,NULL,'2025-08-25 21:49:02'),(56,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"DANILO JAVIER CIAN\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"DANILO JAVIER CIAN\"}',NULL,NULL,'2025-08-25 21:49:02'),(57,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Pighin Cristian\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Pighin Cristian\"}',NULL,NULL,'2025-08-25 21:49:02'),(58,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Torterola Eduardo\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Torterola Eduardo\"}',NULL,NULL,'2025-08-25 21:49:02'),(59,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Nardelli Emilio\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Nardelli Emilio\"}',NULL,NULL,'2025-08-25 21:49:02'),(60,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Cripovich Fernando\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Cripovich Fernando\"}',NULL,NULL,'2025-08-25 21:49:02'),(61,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Cussit Francisco\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Cussit Francisco\"}',NULL,NULL,'2025-08-25 21:49:02'),(62,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Romagnoli Guilllermo\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Romagnoli Guilllermo\"}',NULL,NULL,'2025-08-25 21:49:02'),(63,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Leguizamon Gustavo\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Leguizamon Gustavo\"}',NULL,NULL,'2025-08-25 21:49:02'),(64,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Masat Gustavo\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Masat Gustavo\"}',NULL,NULL,'2025-08-25 21:49:02'),(65,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Vera Gustavo\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Vera Gustavo\"}',NULL,NULL,'2025-08-25 21:49:02'),(66,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Bieri Javier\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Bieri Javier\"}',NULL,NULL,'2025-08-25 21:49:02'),(67,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Rassmusen Leonardo\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Rassmusen Leonardo\"}',NULL,NULL,'2025-08-25 21:49:02'),(68,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"PAULA LORETANI\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"PAULA LORETANI\"}',NULL,NULL,'2025-08-25 21:49:02'),(69,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Llarens Luis\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Llarens Luis\"}',NULL,NULL,'2025-08-25 21:49:02'),(70,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Mansur Luis\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Mansur Luis\"}',NULL,NULL,'2025-08-25 21:49:02'),(71,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Crismanich Marcelo\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Crismanich Marcelo\"}',NULL,NULL,'2025-08-25 21:49:02'),(72,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Oehrli Mario\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Oehrli Mario\"}',NULL,NULL,'2025-08-25 21:49:02'),(73,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Colombo Martín\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Colombo Martín\"}',NULL,NULL,'2025-08-25 21:49:02'),(74,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Ríos Martin\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Ríos Martin\"}',NULL,NULL,'2025-08-25 21:49:02'),(75,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Nardelli Mauricio\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Nardelli Mauricio\"}',NULL,NULL,'2025-08-25 21:49:03'),(76,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Casella Mauro\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Casella Mauro\"}',NULL,NULL,'2025-08-25 21:49:03'),(77,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Marega Mauro\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Marega Mauro\"}',NULL,NULL,'2025-08-25 21:49:03'),(78,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"ADRIAN EMILIO NARDELLI\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"ADRIAN EMILIO NARDELLI\"}',NULL,NULL,'2025-08-25 21:49:03'),(79,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"MAURICIO NARDELLI\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"MAURICIO NARDELLI\"}',NULL,NULL,'2025-08-25 21:49:03'),(80,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"SANDRO NOBILE\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"SANDRO NOBILE\"}',NULL,NULL,'2025-08-25 21:49:03'),(81,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Zamer Omar\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Zamer Omar\"}',NULL,NULL,'2025-08-25 21:49:03'),(82,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Vicentin Juan Pablo\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Vicentin Juan Pablo\"}',NULL,NULL,'2025-08-25 21:49:03'),(83,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"MARCELO PADUAN\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"MARCELO PADUAN\"}',NULL,NULL,'2025-08-25 21:49:03'),(84,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Loretani Paula\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Loretani Paula\"}',NULL,NULL,'2025-08-25 21:49:03'),(85,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"CESAR DANIEL PRADO\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"CESAR DANIEL PRADO\"}',NULL,NULL,'2025-08-25 21:49:03'),(86,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Scheidegger Rene\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Scheidegger Rene\"}',NULL,NULL,'2025-08-25 21:49:03'),(87,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Masat Ricardo\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Masat Ricardo\"}',NULL,NULL,'2025-08-25 21:49:03'),(88,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Nobile Sandro\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Nobile Sandro\"}',NULL,NULL,'2025-08-25 21:49:03'),(89,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Perez Valeria\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Perez Valeria\"}',NULL,NULL,'2025-08-25 21:49:03'),(90,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"JUAN CASTRO VIDELA\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"JUAN CASTRO VIDELA\"}',NULL,NULL,'2025-08-25 21:49:03'),(91,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Fabricio Aquino\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Fabricio Aquino\"}',NULL,NULL,'2025-08-26 10:41:29'),(92,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Lucio Audicio\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Lucio Audicio\"}',NULL,NULL,'2025-08-26 14:29:56'),(93,1,NULL,'admin','participant_added','tournament',6,'{\"message\": \"Participante \\\"Pepe Golf\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Pepe Golf\"}',NULL,NULL,'2025-08-26 15:15:31'),(94,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Agustin Nardelli\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Agustin Nardelli\"}',NULL,NULL,'2025-08-27 11:43:37'),(95,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Alberto Leguizamon\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Alberto Leguizamon\"}',NULL,NULL,'2025-08-27 11:43:37'),(96,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Ariel Basabilbaso\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Ariel Basabilbaso\"}',NULL,NULL,'2025-08-27 11:43:37'),(97,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Bruno Nardelli\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Bruno Nardelli\"}',NULL,NULL,'2025-08-27 11:43:37'),(98,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Cesar Daniel Prado\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Cesar Daniel Prado\"}',NULL,NULL,'2025-08-27 11:43:37'),(99,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Cristian Pighin\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Cristian Pighin\"}',NULL,NULL,'2025-08-27 11:43:37'),(100,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Danilo Javier Cian\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Danilo Javier Cian\"}',NULL,NULL,'2025-08-27 11:43:37'),(101,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Eduardo Torterola\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Eduardo Torterola\"}',NULL,NULL,'2025-08-27 11:43:37'),(102,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Emilio Nardelli\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Emilio Nardelli\"}',NULL,NULL,'2025-08-27 11:43:37'),(103,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Fernando Carlos Cripovich\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Fernando Carlos Cripovich\"}',NULL,NULL,'2025-08-27 11:43:37'),(104,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Gustavo Alberto Ortiz\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Gustavo Alberto Ortiz\"}',NULL,NULL,'2025-08-27 11:43:37'),(105,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Gustavo Gilberto Masat\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Gustavo Gilberto Masat\"}',NULL,NULL,'2025-08-27 11:43:37'),(106,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Gustavo Leguizamon\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Gustavo Leguizamon\"}',NULL,NULL,'2025-08-27 11:43:37'),(107,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Gustavo Vera\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Gustavo Vera\"}',NULL,NULL,'2025-08-27 11:43:37'),(108,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Javier Bieri\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Javier Bieri\"}',NULL,NULL,'2025-08-27 11:43:37'),(109,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Juan Castro Videla\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Juan Castro Videla\"}',NULL,NULL,'2025-08-27 11:43:37'),(110,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Juan De La Cruz Pereyra\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Juan De La Cruz Pereyra\"}',NULL,NULL,'2025-08-27 11:43:37'),(111,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Juan Pablo Vicentin\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Juan Pablo Vicentin\"}',NULL,NULL,'2025-08-27 11:43:37'),(112,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Leonardo Jose Rassmusen\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Leonardo Jose Rassmusen\"}',NULL,NULL,'2025-08-27 11:43:37'),(113,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Loubierejorge Carlos\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Loubierejorge Carlos\"}',NULL,NULL,'2025-08-27 11:43:37'),(114,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Luis Fernando Llarens\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Luis Fernando Llarens\"}',NULL,NULL,'2025-08-27 11:43:37'),(115,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Marcelo Crismanich\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Marcelo Crismanich\"}',NULL,NULL,'2025-08-27 11:43:37'),(116,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Marcelo Paduan\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Marcelo Paduan\"}',NULL,NULL,'2025-08-27 11:43:37'),(117,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Mario Oehrli\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Mario Oehrli\"}',NULL,NULL,'2025-08-27 11:43:37'),(118,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Martin Abel Rios\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Martin Abel Rios\"}',NULL,NULL,'2025-08-27 11:43:38'),(119,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Mauricio Nardelli\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Mauricio Nardelli\"}',NULL,NULL,'2025-08-27 11:43:38'),(120,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Mauro Casella\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Mauro Casella\"}',NULL,NULL,'2025-08-27 11:43:38'),(121,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Mauro Marega\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Mauro Marega\"}',NULL,NULL,'2025-08-27 11:43:38'),(122,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Moises Luis Mansur\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Moises Luis Mansur\"}',NULL,NULL,'2025-08-27 11:43:38'),(123,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Omar Zamer\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Omar Zamer\"}',NULL,NULL,'2025-08-27 11:43:38'),(124,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Paula Loretani\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Paula Loretani\"}',NULL,NULL,'2025-08-27 11:43:38'),(125,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Paulo Nardelli\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Paulo Nardelli\"}',NULL,NULL,'2025-08-27 11:43:38'),(126,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Rene Scheidegger\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Rene Scheidegger\"}',NULL,NULL,'2025-08-27 11:43:38'),(127,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Ricardo Masat\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Ricardo Masat\"}',NULL,NULL,'2025-08-27 11:43:38'),(128,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Sandro Nobile\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Sandro Nobile\"}',NULL,NULL,'2025-08-27 11:43:38'),(129,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Merele Rosana\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Merele Rosana\"}',NULL,NULL,'2025-08-27 12:09:49'),(130,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Diego Brest\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Diego Brest\"}',NULL,NULL,'2025-08-27 13:13:06'),(131,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Federico Fleita\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Federico Fleita\"}',NULL,NULL,'2025-08-27 13:13:06'),(132,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Jose Perez\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Jose Perez\"}',NULL,NULL,'2025-08-27 13:13:06'),(133,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Merele Rosana\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Merele Rosana\"}',NULL,NULL,'2025-08-27 13:13:06'),(134,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Rafael Espinoza\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Rafael Espinoza\"}',NULL,NULL,'2025-08-27 13:13:06'),(135,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Vicente Briglia\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Vicente Briglia\"}',NULL,NULL,'2025-08-27 13:13:06'),(136,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Adrian Godoy\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Adrian Godoy\"}',NULL,NULL,'2025-08-27 13:43:32'),(137,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Diego Brest\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Diego Brest\"}',NULL,NULL,'2025-08-27 13:43:32'),(138,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Diego Rodriguez\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Diego Rodriguez\"}',NULL,NULL,'2025-08-27 13:43:32'),(139,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Esteban Insaurrualde\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Esteban Insaurrualde\"}',NULL,NULL,'2025-08-27 13:43:32'),(140,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Federico Fleita\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Federico Fleita\"}',NULL,NULL,'2025-08-27 13:43:32'),(141,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Jose Perez\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Jose Perez\"}',NULL,NULL,'2025-08-27 13:43:32'),(142,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Juan Insaurrualde\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Juan Insaurrualde\"}',NULL,NULL,'2025-08-27 13:43:32'),(143,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Juan Roubineau\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Juan Roubineau\"}',NULL,NULL,'2025-08-27 13:43:32'),(144,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Martin Insaurrualde\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Martin Insaurrualde\"}',NULL,NULL,'2025-08-27 13:43:32'),(145,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Merele Rosana\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Merele Rosana\"}',NULL,NULL,'2025-08-27 13:43:32'),(146,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Pablo Lomonaco\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Pablo Lomonaco\"}',NULL,NULL,'2025-08-27 13:43:32'),(147,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Rafael Espinoza\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Rafael Espinoza\"}',NULL,NULL,'2025-08-27 13:43:32'),(148,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Vicente Briglia\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Vicente Briglia\"}',NULL,NULL,'2025-08-27 13:43:32'),(149,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Adrian Godoy\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Adrian Godoy\"}',NULL,NULL,'2025-08-28 18:03:03'),(150,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Diego Brest\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Diego Brest\"}',NULL,NULL,'2025-08-28 18:03:03'),(151,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Diego Rodriguez\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Diego Rodriguez\"}',NULL,NULL,'2025-08-28 18:03:03'),(152,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Esteban Insaurrualde\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Esteban Insaurrualde\"}',NULL,NULL,'2025-08-28 18:03:03'),(153,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Federico Fleita\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Federico Fleita\"}',NULL,NULL,'2025-08-28 18:03:03'),(154,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Juan Insaurrualde\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Juan Insaurrualde\"}',NULL,NULL,'2025-08-28 18:03:03'),(155,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Juan Roubineau\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Juan Roubineau\"}',NULL,NULL,'2025-08-28 18:03:03'),(156,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Martin Insaurrualde\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Martin Insaurrualde\"}',NULL,NULL,'2025-08-28 18:03:03'),(157,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Merele Rosana\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Merele Rosana\"}',NULL,NULL,'2025-08-28 18:03:03'),(158,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Pablo Lomonaco\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Pablo Lomonaco\"}',NULL,NULL,'2025-08-28 18:03:03'),(159,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Rafael Espinoza\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Rafael Espinoza\"}',NULL,NULL,'2025-08-28 18:03:04'),(160,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Vicente Briglia\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Vicente Briglia\"}',NULL,NULL,'2025-08-28 18:03:04'),(161,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Juan Roubineau\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Juan Roubineau\"}',NULL,NULL,'2025-08-29 09:57:00'),(162,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Rafael Espinoza\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Rafael Espinoza\"}',NULL,NULL,'2025-08-29 09:57:21'),(163,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Vicente Briglia\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Vicente Briglia\"}',NULL,NULL,'2025-08-29 09:57:21'),(164,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Adrian Godoy\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Adrian Godoy\"}',NULL,NULL,'2025-08-29 09:58:28'),(165,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Diego Brest\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Diego Brest\"}',NULL,NULL,'2025-08-29 09:58:28'),(166,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Diego Rodriguez\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Diego Rodriguez\"}',NULL,NULL,'2025-08-29 09:58:28'),(167,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Esteban Insaurrualde\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Esteban Insaurrualde\"}',NULL,NULL,'2025-08-29 09:58:28'),(168,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Federico Fleita\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Federico Fleita\"}',NULL,NULL,'2025-08-29 09:58:28'),(169,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Juan Insaurrualde\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Juan Insaurrualde\"}',NULL,NULL,'2025-08-29 09:58:28'),(170,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Martin Insaurrualde\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Martin Insaurrualde\"}',NULL,NULL,'2025-08-29 09:58:28'),(171,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Merele Rosana\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Merele Rosana\"}',NULL,NULL,'2025-08-29 09:58:28'),(172,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Pablo Lomonaco\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Pablo Lomonaco\"}',NULL,NULL,'2025-08-29 09:58:28'),(173,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Adrian Santajuliana\\\" agregado al torneo\", \"player_type\": \"external\", \"participant_name\": \"Adrian Santajuliana\"}',NULL,NULL,'2025-08-29 10:20:01'),(174,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Agustin Lopez\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Agustin Lopez\"}',NULL,NULL,'2025-08-29 11:52:58'),(175,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Carlos Nardelli\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Carlos Nardelli\"}',NULL,NULL,'2025-08-29 11:52:58'),(176,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Dardo Insaurralde\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Dardo Insaurralde\"}',NULL,NULL,'2025-08-29 11:52:58'),(177,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Eduardo Ciepielak\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Eduardo Ciepielak\"}',NULL,NULL,'2025-08-29 11:52:58'),(178,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Guillermo Nardelli\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Guillermo Nardelli\"}',NULL,NULL,'2025-08-29 11:52:58'),(179,1,NULL,'admin','participant_added','tournament',7,'{\"message\": \"Participante \\\"Jose Ign Nardelli\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Jose Ign Nardelli\"}',NULL,NULL,'2025-08-29 11:52:58'),(180,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Adrian Godoy\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Adrian Godoy\"}',NULL,NULL,'2025-08-29 14:55:04'),(181,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Adrian Santajuliana\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Adrian Santajuliana\"}',NULL,NULL,'2025-08-29 14:55:04'),(182,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Diego Brest\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Diego Brest\"}',NULL,NULL,'2025-08-29 14:55:04'),(183,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Diego Rodriguez\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Diego Rodriguez\"}',NULL,NULL,'2025-08-29 14:55:04'),(184,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Esteban Insaurrualde\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Esteban Insaurrualde\"}',NULL,NULL,'2025-08-29 14:55:04'),(185,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Federico Fleita\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Federico Fleita\"}',NULL,NULL,'2025-08-29 14:55:04'),(186,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Juan Insaurrualde\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Juan Insaurrualde\"}',NULL,NULL,'2025-08-29 14:55:04'),(187,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Juan Roubineau\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Juan Roubineau\"}',NULL,NULL,'2025-08-29 14:55:04'),(188,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Martin Insaurrualde\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Martin Insaurrualde\"}',NULL,NULL,'2025-08-29 14:55:04'),(189,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Merele Rosana\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Merele Rosana\"}',NULL,NULL,'2025-08-29 14:55:04'),(190,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Pablo Lomonaco\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Pablo Lomonaco\"}',NULL,NULL,'2025-08-29 14:55:04'),(191,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Rafael Espinoza\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Rafael Espinoza\"}',NULL,NULL,'2025-08-29 14:55:04'),(192,4,NULL,'admin','participant_added','tournament',8,'{\"message\": \"Participante \\\"Vicente Briglia\\\" agregado al torneo\", \"player_type\": \"member\", \"participant_name\": \"Vicente Briglia\"}',NULL,NULL,'2025-08-29 14:55:04'),(193,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 1 movido al hoyo 1 con horario 08:00\", \"group_number\": 1, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 1}',NULL,NULL,'2025-08-30 16:13:00'),(194,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 2 movido al hoyo 1 con horario 08:10\", \"group_number\": 2, \"new_tee_time\": \"08:10\", \"affected_players\": 4, \"new_starting_hole\": 1}',NULL,NULL,'2025-08-30 16:13:01'),(195,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 14\", \"tee_time\": \"14:30:00\", \"new_group\": 14, \"starting_hole\": 5, \"participation_id\": 88}',NULL,NULL,'2025-08-30 20:46:29'),(196,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 11\", \"tee_time\": \"14:30:00\", \"new_group\": 11, \"starting_hole\": 2, \"participation_id\": 90}',NULL,NULL,'2025-08-30 20:46:51'),(197,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 14\", \"tee_time\": \"14:30:00\", \"new_group\": 14, \"starting_hole\": 5, \"participation_id\": 64}',NULL,NULL,'2025-08-30 20:47:11'),(198,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 11\", \"tee_time\": \"14:30:00\", \"new_group\": 11, \"starting_hole\": 2, \"participation_id\": 66}',NULL,NULL,'2025-08-30 20:47:58'),(199,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 11 movido al hoyo 2 con horario 08:00\", \"group_number\": 11, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 2}',NULL,NULL,'2025-08-30 20:48:01'),(200,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 5\", \"tee_time\": \"14:00:00\", \"new_group\": 5, \"starting_hole\": 5, \"participation_id\": 128}',NULL,NULL,'2025-08-30 20:50:13'),(201,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 1\", \"tee_time\": \"14:00:00\", \"new_group\": 1, \"starting_hole\": 1, \"participation_id\": 78}',NULL,NULL,'2025-08-30 20:50:22'),(202,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"14:00:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 77}',NULL,NULL,'2025-08-30 20:51:16'),(203,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"14:00:00\", \"new_group\": 2, \"starting_hole\": 2, \"participation_id\": 77}',NULL,NULL,'2025-08-30 20:51:19'),(204,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"14:00:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 72}',NULL,NULL,'2025-08-30 20:51:37'),(205,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"14:00:00\", \"new_group\": 2, \"starting_hole\": 2, \"participation_id\": 71}',NULL,NULL,'2025-08-30 20:51:40'),(206,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"14:00:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 77}',NULL,NULL,'2025-08-30 20:51:56'),(207,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 2\", \"tee_time\": \"14:00:00\", \"new_group\": 2, \"starting_hole\": 2, \"participation_id\": 65}',NULL,NULL,'2025-08-30 20:52:03'),(208,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"14:00:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 67}',NULL,NULL,'2025-08-30 20:53:06'),(209,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 5\", \"tee_time\": \"14:00:00\", \"new_group\": 5, \"starting_hole\": 5, \"participation_id\": 72}',NULL,NULL,'2025-08-30 20:53:24'),(210,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 3\", \"tee_time\": \"14:00:00\", \"new_group\": 3, \"starting_hole\": 3, \"participation_id\": 133}',NULL,NULL,'2025-08-30 20:53:35'),(211,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 6\", \"tee_time\": \"14:00:00\", \"new_group\": 6, \"starting_hole\": 6, \"participation_id\": 87}',NULL,NULL,'2025-08-30 20:54:51'),(212,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 7\", \"tee_time\": \"14:00:00\", \"new_group\": 7, \"starting_hole\": 7, \"participation_id\": 129}',NULL,NULL,'2025-08-30 20:54:54'),(213,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 6\", \"tee_time\": \"14:00:00\", \"new_group\": 6, \"starting_hole\": 6, \"participation_id\": 131}',NULL,NULL,'2025-08-30 20:55:00'),(214,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 7\", \"tee_time\": \"14:00:00\", \"new_group\": 7, \"starting_hole\": 7, \"participation_id\": 79}',NULL,NULL,'2025-08-30 20:55:16'),(215,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 15\", \"tee_time\": null, \"new_group\": 15, \"starting_hole\": 1, \"participation_id\": 92}',NULL,NULL,'2025-08-30 20:57:24'),(216,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 15\", \"tee_time\": null, \"new_group\": 15, \"starting_hole\": 1, \"participation_id\": 93}',NULL,NULL,'2025-08-30 20:57:33'),(217,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 10\", \"tee_time\": \"14:30:00\", \"new_group\": 10, \"starting_hole\": 1, \"participation_id\": 60}',NULL,NULL,'2025-08-30 20:57:45'),(218,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 10\", \"tee_time\": \"14:30:00\", \"new_group\": 10, \"starting_hole\": 1, \"participation_id\": 132}',NULL,NULL,'2025-08-30 20:58:25'),(219,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 15\", \"tee_time\": null, \"new_group\": 15, \"starting_hole\": 1, \"participation_id\": 142}',NULL,NULL,'2025-08-30 20:59:04'),(220,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 13\", \"tee_time\": \"14:30:00\", \"new_group\": 13, \"starting_hole\": 4, \"participation_id\": 88}',NULL,NULL,'2025-08-30 20:59:06'),(221,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 15\", \"tee_time\": null, \"new_group\": 15, \"starting_hole\": 1, \"participation_id\": 145}',NULL,NULL,'2025-08-30 20:59:29'),(222,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 13\", \"tee_time\": \"14:30:00\", \"new_group\": 13, \"starting_hole\": 4, \"participation_id\": 91}',NULL,NULL,'2025-08-30 20:59:50'),(223,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 4\", \"tee_time\": \"14:00:00\", \"new_group\": 4, \"starting_hole\": 4, \"participation_id\": 89}',NULL,NULL,'2025-08-30 21:00:15'),(224,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 5\", \"tee_time\": \"14:00:00\", \"new_group\": 5, \"starting_hole\": 5, \"participation_id\": 84}',NULL,NULL,'2025-08-30 21:00:18'),(225,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 4\", \"tee_time\": \"14:00:00\", \"new_group\": 4, \"starting_hole\": 4, \"participation_id\": 83}',NULL,NULL,'2025-08-30 21:01:42'),(226,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 7\", \"tee_time\": \"14:00:00\", \"new_group\": 7, \"starting_hole\": 7, \"participation_id\": 127}',NULL,NULL,'2025-08-30 21:03:41'),(227,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 8\", \"tee_time\": \"14:00:00\", \"new_group\": 8, \"starting_hole\": 8, \"participation_id\": 79}',NULL,NULL,'2025-08-30 21:03:57'),(228,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 8\", \"tee_time\": \"14:00:00\", \"new_group\": 8, \"starting_hole\": 8, \"participation_id\": 129}',NULL,NULL,'2025-08-30 21:04:00'),(229,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 7\", \"tee_time\": \"14:00:00\", \"new_group\": 7, \"starting_hole\": 7, \"participation_id\": 92}',NULL,NULL,'2025-08-30 21:04:15'),(230,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 7\", \"tee_time\": \"14:00:00\", \"new_group\": 7, \"starting_hole\": 7, \"participation_id\": 69}',NULL,NULL,'2025-08-30 21:04:32'),(231,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 9\", \"tee_time\": \"14:00:00\", \"new_group\": 9, \"starting_hole\": 9, \"participation_id\": 63}',NULL,NULL,'2025-08-30 21:05:13'),(232,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 9\", \"tee_time\": \"14:00:00\", \"new_group\": 9, \"starting_hole\": 9, \"participation_id\": 87}',NULL,NULL,'2025-08-30 21:05:37'),(233,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 8\", \"tee_time\": \"14:00:00\", \"new_group\": 8, \"starting_hole\": 8, \"participation_id\": 62}',NULL,NULL,'2025-08-30 21:05:48'),(234,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 9\", \"tee_time\": \"14:00:00\", \"new_group\": 9, \"starting_hole\": 9, \"participation_id\": 138}',NULL,NULL,'2025-08-30 21:05:52'),(235,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 14\", \"tee_time\": \"14:30:00\", \"new_group\": 14, \"starting_hole\": 5, \"participation_id\": 62}',NULL,NULL,'2025-08-30 21:08:32'),(236,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 15\", \"tee_time\": null, \"new_group\": 15, \"starting_hole\": 1, \"participation_id\": 140}',NULL,NULL,'2025-08-30 21:08:58'),(237,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 14\", \"tee_time\": \"14:30:00\", \"new_group\": 14, \"starting_hole\": 5, \"participation_id\": 86}',NULL,NULL,'2025-08-30 21:09:26'),(238,1,NULL,'admin','player_moved','tournament',7,'{\"message\": \"Jugador movido al grupo 6\", \"tee_time\": \"14:00:00\", \"new_group\": 6, \"starting_hole\": 6, \"participation_id\": 93}',NULL,NULL,'2025-08-30 21:10:08'),(239,1,NULL,'admin','groups_renumbered','tournament',7,'{\"group1\": 1, \"group2\": 6, \"message\": \"Grupos renumerados: 1 ↔ 6\"}',NULL,NULL,'2025-08-30 21:12:33'),(240,1,NULL,'admin','groups_renumbered','tournament',7,'{\"group1\": 7, \"group2\": 4, \"message\": \"Grupos renumerados: 7 ↔ 4\"}',NULL,NULL,'2025-08-30 21:13:34'),(241,1,NULL,'admin','groups_renumbered','tournament',7,'{\"group1\": 9, \"group2\": 1, \"message\": \"Grupos renumerados: 9 ↔ 1\"}',NULL,NULL,'2025-08-30 21:14:38'),(242,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 9 movido al hoyo 6 con horario 08:10\", \"group_number\": 9, \"new_tee_time\": \"08:10\", \"affected_players\": 3, \"new_starting_hole\": 6}',NULL,NULL,'2025-08-30 21:15:32'),(243,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 9 movido al hoyo 6 con horario 08:00\", \"group_number\": 9, \"new_tee_time\": \"08:00\", \"affected_players\": 3, \"new_starting_hole\": 6}',NULL,NULL,'2025-08-30 21:15:45'),(244,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 15 movido al hoyo 1 con horario 20:16\", \"group_number\": 15, \"new_tee_time\": \"20:16\", \"affected_players\": 3, \"new_starting_hole\": 1}',NULL,NULL,'2025-08-30 21:16:06'),(245,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 15 movido al hoyo 1 con horario 20:00\", \"group_number\": 15, \"new_tee_time\": \"20:00\", \"affected_players\": 3, \"new_starting_hole\": 1}',NULL,NULL,'2025-08-30 21:16:08'),(246,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 15 movido al hoyo 1 con horario 08:00\", \"group_number\": 15, \"new_tee_time\": \"08:00\", \"affected_players\": 3, \"new_starting_hole\": 1}',NULL,NULL,'2025-08-30 21:16:09'),(247,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 14 movido al hoyo 5 con horario 08:10\", \"group_number\": 14, \"new_tee_time\": \"08:10\", \"affected_players\": 4, \"new_starting_hole\": 5}',NULL,NULL,'2025-08-30 21:16:17'),(248,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 14 movido al hoyo 5 con horario 08:00\", \"group_number\": 14, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 5}',NULL,NULL,'2025-08-30 21:16:24'),(249,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 12 movido al hoyo 3 con horario 08:10\", \"group_number\": 12, \"new_tee_time\": \"08:10\", \"affected_players\": 3, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-30 21:16:55'),(250,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 12 movido al hoyo 3 con horario 08:00\", \"group_number\": 12, \"new_tee_time\": \"08:00\", \"affected_players\": 3, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-30 21:17:01'),(251,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 11 movido al hoyo 2 con horario 08:00\", \"group_number\": 11, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 2}',NULL,NULL,'2025-08-30 21:43:53'),(252,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 12 movido al hoyo 3 con horario 08:10\", \"group_number\": 12, \"new_tee_time\": \"08:10\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-30 21:43:59'),(253,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 13 movido al hoyo 4 con horario 08:20\", \"group_number\": 13, \"new_tee_time\": \"08:20\", \"affected_players\": 4, \"new_starting_hole\": 4}',NULL,NULL,'2025-08-30 21:44:02'),(254,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 12 movido al hoyo 3 con horario 14:40\", \"group_number\": 12, \"new_tee_time\": \"14:40\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-30 21:49:17'),(255,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 12 movido al hoyo 3 con horario 08:30\", \"group_number\": 12, \"new_tee_time\": \"08:30\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-30 21:49:21'),(256,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 12 movido al hoyo 3 con horario 08:00\", \"group_number\": 12, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-30 21:50:05'),(257,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 13 movido al hoyo 4 con horario 08:59\", \"group_number\": 13, \"new_tee_time\": \"08:59\", \"affected_players\": 4, \"new_starting_hole\": 4}',NULL,NULL,'2025-08-30 21:50:12'),(258,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 13 movido al hoyo 4 con horario 08:00\", \"group_number\": 13, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 4}',NULL,NULL,'2025-08-30 21:50:15'),(259,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 9 movido al hoyo 9 con horario 08:10\", \"group_number\": 9, \"new_tee_time\": \"08:10\", \"affected_players\": 4, \"new_starting_hole\": 9}',NULL,NULL,'2025-08-30 21:51:04'),(260,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 11 movido al hoyo 2 con horario 14:40\", \"group_number\": 11, \"new_tee_time\": \"14:40\", \"affected_players\": 4, \"new_starting_hole\": 2}',NULL,NULL,'2025-08-30 21:51:13'),(261,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 11 movido al hoyo 2 con horario 08:20\", \"group_number\": 11, \"new_tee_time\": \"08:20\", \"affected_players\": 4, \"new_starting_hole\": 2}',NULL,NULL,'2025-08-30 21:51:14'),(262,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 11 movido al hoyo 2 con horario 08:00\", \"group_number\": 11, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 2}',NULL,NULL,'2025-08-30 22:01:39'),(263,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 12 movido al hoyo 3 con horario 08:10\", \"group_number\": 12, \"new_tee_time\": \"08:10\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-30 22:01:44'),(264,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 8 movido al hoyo 8 con horario 08:20\", \"group_number\": 8, \"new_tee_time\": \"08:20\", \"affected_players\": 4, \"new_starting_hole\": 8}',NULL,NULL,'2025-08-30 22:09:33'),(265,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 8 movido al hoyo 8 con horario 08:20\", \"group_number\": 8, \"new_tee_time\": \"08:20\", \"affected_players\": 4, \"new_starting_hole\": 8}',NULL,NULL,'2025-08-30 22:09:33'),(266,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 11 movido al hoyo 2 con horario 08:00\", \"group_number\": 11, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 2}',NULL,NULL,'2025-08-30 22:10:03'),(267,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 12 movido al hoyo 3 con horario 08:10\", \"group_number\": 12, \"new_tee_time\": \"08:10\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-30 22:10:06'),(268,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 11 movido al hoyo 2 con horario 08:00\", \"group_number\": 11, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 2}',NULL,NULL,'2025-08-30 22:10:36'),(269,1,NULL,'admin','group_moved','tournament',7,'{\"message\": \"Grupo 12 movido al hoyo 3 con horario 08:00\", \"group_number\": 12, \"new_tee_time\": \"08:00\", \"affected_players\": 4, \"new_starting_hole\": 3}',NULL,NULL,'2025-08-30 22:10:37'),(270,1,547,'member','scorecard_saved','scorecard',13,'{\"method\": \"manual\", \"message\": \"Tarjeta guardada: 18 hoyos, 91 golpes\", \"verified\": true}',NULL,NULL,'2025-08-30 23:14:42'),(271,1,547,'member','scorecard_saved','scorecard',13,'{\"method\": \"manual\", \"message\": \"Tarjeta guardada: 18 hoyos, 81 golpes\", \"verified\": true}',NULL,NULL,'2025-09-01 20:02:38'),(272,1,507,'member','scorecard_saved','scorecard',19,'{\"method\": \"manual\", \"message\": \"Tarjeta guardada: 18 hoyos, 82 golpes\", \"verified\": true}',NULL,NULL,'2025-09-01 20:15:45'),(273,1,589,'member','scorecard_saved','scorecard',20,'{\"method\": \"manual\", \"message\": \"Tarjeta guardada: 18 hoyos, 63 golpes\", \"verified\": true}',NULL,NULL,'2025-09-01 20:17:50');
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `club_administrators`
--

DROP TABLE IF EXISTS `club_administrators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_administrators` (
  `admin_id` int NOT NULL AUTO_INCREMENT,
  `course_id` int DEFAULT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary_admin` tinyint(1) DEFAULT '0',
  `role` enum('system_admin','club_admin') COLLATE utf8mb4_unicode_ci DEFAULT 'club_admin',
  `permissions` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `password_reset_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_reset_expires` timestamp NULL DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `club_administrators_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `golf_courses` (`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `club_administrators`
--

LOCK TABLES `club_administrators` WRITE;
/*!40000 ALTER TABLE `club_administrators` DISABLE KEYS */;
INSERT INTO `club_administrators` VALUES (6,1,'admin_sanjeronimo','admin@sanjeronimo.com','$2b$10$defaulthash','Admin San Jeronimo',NULL,0,'club_admin',NULL,1,NULL,NULL,NULL,NULL,'2025-08-29 14:10:42','2025-08-29 14:10:42'),(7,4,'goya','goya@goya.com','59edbeefb82904e85023a5ab299c87afe6e3ba55aabc3af907d874d7c8056965','goya',NULL,1,'club_admin',NULL,1,NULL,NULL,NULL,1,'2025-08-29 14:43:42','2025-08-29 14:43:42');
/*!40000 ALTER TABLE `club_administrators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clubs`
--

DROP TABLE IF EXISTS `clubs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clubs` (
  `club_id` int NOT NULL AUTO_INCREMENT,
  `club_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`club_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clubs`
--

LOCK TABLES `clubs` WRITE;
/*!40000 ALTER TABLE `clubs` DISABLE KEYS */;
INSERT INTO `clubs` VALUES (1,'San Jer├│nimo del Rey','Corrientes, Argentina','+54 379 XXX-XXXX','info@sanjeronimo.com',NULL,NULL,'2025-09-01 22:04:47','2025-09-01 22:04:47'),(2,'Goya Golf Club','Goya, Corrientes, Argentina','+54 379 YYY-YYYY','info@goyagolf.com',NULL,NULL,'2025-09-01 22:04:47','2025-09-01 22:04:47');
/*!40000 ALTER TABLE `clubs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_holes`
--

DROP TABLE IF EXISTS `course_holes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_holes` (
  `hole_id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `hole_number` int NOT NULL,
  `par` int NOT NULL DEFAULT '4',
  `handicap` int NOT NULL DEFAULT '1',
  `distance_meters` int DEFAULT NULL,
  `distance_yards` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`hole_id`),
  UNIQUE KEY `unique_course_hole` (`course_id`,`hole_number`),
  KEY `idx_course_holes_course` (`course_id`),
  KEY `idx_course_holes_number` (`hole_number`),
  CONSTRAINT `course_holes_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `golf_courses` (`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Información detallada de cada hoyo por campo de golf';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_holes`
--

LOCK TABLES `course_holes` WRITE;
/*!40000 ALTER TABLE `course_holes` DISABLE KEYS */;
INSERT INTO `course_holes` VALUES (1,1,1,4,15,350,383,'Hoyo 1 - Par 4','2025-08-31 02:03:57','2025-09-01 10:58:19'),(2,1,2,4,2,350,383,'Hoyo 2 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(3,1,3,3,13,150,164,'Hoyo 3 - Par 3','2025-08-31 02:03:57','2025-09-01 11:17:20'),(4,1,4,5,7,350,383,'Hoyo 4 - Par 4','2025-08-31 02:03:57','2025-09-01 11:17:12'),(5,1,5,3,17,500,547,'Hoyo 5 - Par 5','2025-08-31 02:03:57','2025-09-01 11:18:15'),(6,1,6,4,9,150,164,'Hoyo 6 - Par 3','2025-08-31 02:03:57','2025-09-01 11:18:54'),(7,1,7,4,7,350,383,'Hoyo 7 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(8,1,8,4,5,150,164,'Hoyo 8 - Par 3','2025-08-31 02:03:57','2025-09-01 11:19:57'),(9,1,9,5,9,500,547,'Hoyo 9 - Par 5','2025-08-31 02:03:57','2025-08-31 02:03:57'),(10,1,10,3,16,350,383,'Hoyo 10 - Par 4','2025-08-31 02:03:57','2025-09-01 11:26:12'),(11,1,11,5,6,350,383,'Hoyo 11 - Par 4','2025-08-31 02:03:57','2025-09-01 11:37:18'),(12,1,12,4,10,150,164,'Hoyo 12 - Par 3','2025-08-31 02:03:57','2025-09-01 11:37:55'),(13,1,13,4,2,350,383,'Hoyo 13 - Par 4','2025-08-31 02:03:57','2025-09-01 11:38:34'),(14,1,14,3,18,500,547,'Hoyo 14 - Par 5','2025-08-31 02:03:57','2025-09-01 11:39:10'),(15,1,15,4,14,150,164,'Hoyo 15 - Par 3','2025-08-31 02:03:57','2025-09-01 11:39:47'),(16,1,16,4,8,350,383,'Hoyo 16 - Par 4','2025-08-31 02:03:57','2025-09-01 11:40:23'),(17,1,17,4,12,150,164,'Hoyo 17 - Par 3','2025-08-31 02:03:57','2025-09-01 11:41:00'),(18,1,18,5,4,500,547,'Hoyo 18 - Par 5','2025-08-31 02:03:57','2025-09-01 11:41:36'),(19,4,1,4,1,350,383,'Hoyo 1 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(20,4,2,4,2,350,383,'Hoyo 2 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(21,4,3,3,3,150,164,'Hoyo 3 - Par 3','2025-08-31 02:03:57','2025-08-31 02:03:57'),(22,4,4,4,4,350,383,'Hoyo 4 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(23,4,5,5,5,500,547,'Hoyo 5 - Par 5','2025-08-31 02:03:57','2025-08-31 02:03:57'),(24,4,6,3,6,150,164,'Hoyo 6 - Par 3','2025-08-31 02:03:57','2025-08-31 02:03:57'),(25,4,7,4,7,350,383,'Hoyo 7 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(26,4,8,3,8,150,164,'Hoyo 8 - Par 3','2025-08-31 02:03:57','2025-08-31 02:03:57'),(27,4,9,5,9,500,547,'Hoyo 9 - Par 5','2025-08-31 02:03:57','2025-08-31 02:03:57'),(28,4,10,4,10,350,383,'Hoyo 10 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(29,4,11,4,11,350,383,'Hoyo 11 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(30,4,12,3,12,150,164,'Hoyo 12 - Par 3','2025-08-31 02:03:57','2025-08-31 02:03:57'),(31,4,13,4,13,350,383,'Hoyo 13 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(32,4,14,5,14,500,547,'Hoyo 14 - Par 5','2025-08-31 02:03:57','2025-08-31 02:03:57'),(33,4,15,3,15,150,164,'Hoyo 15 - Par 3','2025-08-31 02:03:57','2025-08-31 02:03:57'),(34,4,16,4,16,350,383,'Hoyo 16 - Par 4','2025-08-31 02:03:57','2025-08-31 02:03:57'),(35,4,17,3,17,150,164,'Hoyo 17 - Par 3','2025-08-31 02:03:57','2025-08-31 02:03:57'),(36,4,18,5,18,500,547,'Hoyo 18 - Par 5','2025-08-31 02:03:57','2025-08-31 02:03:57');
/*!40000 ALTER TABLE `course_holes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_tees`
--

DROP TABLE IF EXISTS `course_tees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_tees` (
  `tee_id` int NOT NULL AUTO_INCREMENT,
  `hole_id` int NOT NULL,
  `tee_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej: Negro, Rojo, Azul, Amarillo',
  `tee_color` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Color hex o nombre: #000000, black, red, etc',
  `category` enum('men','women','senior','junior') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'men',
  `distance_yards` int NOT NULL COMMENT 'Distancia en yardas',
  `is_default` tinyint(1) DEFAULT '0' COMMENT 'Tee por defecto para esta categoría',
  `display_order` int DEFAULT '1' COMMENT 'Orden de visualización',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tee_id`),
  UNIQUE KEY `unique_hole_tee_name` (`hole_id`,`tee_name`),
  KEY `idx_course_tees_hole` (`hole_id`),
  KEY `idx_course_tees_category` (`category`),
  KEY `idx_course_tees_color` (`tee_color`),
  CONSTRAINT `course_tees_ibfk_1` FOREIGN KEY (`hole_id`) REFERENCES `course_holes` (`hole_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Múltiples tees/salidas por hoyo con distancias y categorías';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_tees`
--

LOCK TABLES `course_tees` WRITE;
/*!40000 ALTER TABLE `course_tees` DISABLE KEYS */;
INSERT INTO `course_tees` VALUES (1,1,'Blanco','#FFFFFF','men',328,1,1,'2025-08-31 11:58:03','2025-08-31 12:08:43'),(2,1,'Amarillo','#FFD700','women',266,1,2,'2025-08-31 11:58:03','2025-08-31 13:46:03'),(4,2,'Blanco','#FFFFFF','men',435,1,1,'2025-08-31 11:58:03','2025-09-01 11:11:17'),(6,2,'Amarillo','#FFD700','women',364,1,2,'2025-08-31 11:58:03','2025-09-01 11:16:01'),(7,3,'Blanco','#FFFFFF','men',202,1,1,'2025-08-31 11:58:03','2025-09-01 11:16:17'),(8,3,'Amarillo','#FFD700','women',162,1,2,'2025-08-31 11:58:03','2025-09-01 11:17:56'),(10,4,'Blanco','#FFFFFF','men',445,1,1,'2025-08-31 11:58:03','2025-09-01 11:16:55'),(11,4,'Amarillo','#FFD700','women',445,1,2,'2025-08-31 11:58:03','2025-09-01 11:17:52'),(13,5,'Blanco','#FFFFFF','men',133,1,1,'2025-08-31 11:58:03','2025-09-01 11:18:26'),(14,5,'Amarillo','#FFD700','women',97,1,2,'2025-08-31 11:58:03','2025-09-01 11:18:39'),(16,6,'Blanco','#FFFFFF','men',369,1,1,'2025-08-31 11:58:03','2025-09-01 11:19:06'),(17,6,'Amarillo','#FFD700','women',320,1,2,'2025-08-31 11:58:03','2025-09-01 11:19:17'),(19,7,'Blanco','#FFFFFF','men',410,1,1,'2025-08-31 11:58:03','2025-09-01 11:19:36'),(20,7,'Amarillo','#FFD700','women',318,1,2,'2025-08-31 11:58:03','2025-09-01 11:19:46'),(22,8,'Blanco','#FFFFFF','men',380,1,1,'2025-08-31 11:58:03','2025-09-01 11:20:07'),(23,8,'Amarillo','#FFD700','women',335,1,2,'2025-08-31 11:58:03','2025-09-01 11:20:18'),(25,9,'Blanco','#FFFFFF','men',561,1,1,'2025-08-31 11:58:03','2025-09-01 11:20:37'),(26,9,'Amarillo','#FFD700','women',465,1,2,'2025-08-31 11:58:03','2025-09-01 11:20:47'),(28,10,'Negro','#000000','women',120,1,2,'2025-08-31 11:58:03','2025-09-01 11:36:45'),(30,10,'Rojo','#CC0000','men',130,1,1,'2025-08-31 11:58:03','2025-09-01 11:36:28'),(31,11,'Negro','#000000','women',463,1,2,'2025-08-31 11:58:03','2025-09-01 11:37:42'),(33,11,'Rojo','#CC0000','men',550,1,1,'2025-08-31 11:58:03','2025-09-01 11:37:31'),(34,12,'Negro','#000000','women',280,1,2,'2025-08-31 11:58:03','2025-09-01 11:38:22'),(36,12,'Rojo','#CC0000','men',295,1,1,'2025-08-31 11:58:03','2025-09-01 11:38:09'),(37,13,'Negro','#000000','women',280,1,2,'2025-08-31 11:58:03','2025-09-01 11:38:57'),(39,13,'Rojo','#CC0000','men',418,1,1,'2025-08-31 11:58:03','2025-09-01 11:38:46'),(40,14,'Negro','#000000','women',97,1,2,'2025-08-31 11:58:03','2025-09-01 11:39:36'),(42,14,'Rojo','#CC0000','men',133,1,1,'2025-08-31 11:58:04','2025-09-01 11:39:25'),(43,15,'Negro','#000000','women',320,1,2,'2025-08-31 11:58:04','2025-09-01 11:40:12'),(45,15,'Rojo','#CC0000','men',369,1,1,'2025-08-31 11:58:04','2025-09-01 11:40:01'),(46,16,'Negro','#000000','women',362,1,2,'2025-08-31 11:58:04','2025-09-01 11:40:50'),(48,16,'Rojo','#CC0000','men',417,1,1,'2025-08-31 11:58:04','2025-09-01 11:40:36'),(49,17,'Negro','#000000','women',335,1,2,'2025-08-31 11:58:04','2025-09-01 11:41:28'),(51,17,'Rojo','#CC0000','men',384,1,1,'2025-08-31 11:58:04','2025-09-01 11:41:16'),(52,18,'Negro','#000000','women',463,1,2,'2025-08-31 11:58:04','2025-09-01 11:42:04'),(54,18,'Rojo','#CC0000','men',538,1,1,'2025-08-31 11:58:04','2025-09-01 11:41:52'),(55,19,'Negro','#000000','men',420,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(56,19,'Azul','#0066CC','men',380,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(57,19,'Rojo','#CC0000','women',320,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(58,20,'Negro','#000000','men',420,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(59,20,'Azul','#0066CC','men',380,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(60,20,'Rojo','#CC0000','women',320,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(61,21,'Negro','#000000','men',180,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(62,21,'Azul','#0066CC','men',165,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(63,21,'Rojo','#CC0000','women',140,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(64,22,'Negro','#000000','men',420,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(65,22,'Azul','#0066CC','men',380,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(66,22,'Rojo','#CC0000','women',320,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(67,23,'Negro','#000000','men',580,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(68,23,'Azul','#0066CC','men',540,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(69,23,'Rojo','#CC0000','women',480,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(70,24,'Negro','#000000','men',180,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(71,24,'Azul','#0066CC','men',165,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(72,24,'Rojo','#CC0000','women',140,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(73,25,'Negro','#000000','men',420,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(74,25,'Azul','#0066CC','men',380,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(75,25,'Rojo','#CC0000','women',320,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(76,26,'Negro','#000000','men',180,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(77,26,'Azul','#0066CC','men',165,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(78,26,'Rojo','#CC0000','women',140,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(79,27,'Negro','#000000','men',580,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(80,27,'Azul','#0066CC','men',540,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(81,27,'Rojo','#CC0000','women',480,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(82,28,'Negro','#000000','men',420,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(83,28,'Azul','#0066CC','men',380,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(84,28,'Rojo','#CC0000','women',320,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(85,29,'Negro','#000000','men',420,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(86,29,'Azul','#0066CC','men',380,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(87,29,'Rojo','#CC0000','women',320,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(88,30,'Negro','#000000','men',180,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(89,30,'Azul','#0066CC','men',165,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(90,30,'Rojo','#CC0000','women',140,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(91,31,'Negro','#000000','men',420,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(92,31,'Azul','#0066CC','men',380,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(93,31,'Rojo','#CC0000','women',320,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(94,32,'Negro','#000000','men',580,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(95,32,'Azul','#0066CC','men',540,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(96,32,'Rojo','#CC0000','women',480,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(97,33,'Negro','#000000','men',180,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(98,33,'Azul','#0066CC','men',165,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(99,33,'Rojo','#CC0000','women',140,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(100,34,'Negro','#000000','men',420,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(101,34,'Azul','#0066CC','men',380,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(102,34,'Rojo','#CC0000','women',320,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(103,35,'Negro','#000000','men',180,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(104,35,'Azul','#0066CC','men',165,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(105,35,'Rojo','#CC0000','women',140,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(106,36,'Negro','#000000','men',580,1,1,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(107,36,'Azul','#0066CC','men',540,0,2,'2025-08-31 11:58:04','2025-08-31 11:58:04'),(108,36,'Rojo','#CC0000','women',480,1,3,'2025-08-31 11:58:04','2025-08-31 11:58:04');
/*!40000 ALTER TABLE `course_tees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_tees_backup`
--

DROP TABLE IF EXISTS `course_tees_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_tees_backup` (
  `tee_id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `tee_type` enum('negro','azul','blanco','amarillo','rojo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tee_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slope_rating` int NOT NULL,
  `course_rating` decimal(4,1) NOT NULL,
  `par` int DEFAULT '72',
  `total_distance_yards` int DEFAULT '0',
  `gender` enum('M','F','both') COLLATE utf8mb4_unicode_ci DEFAULT 'both',
  `handicap_min` decimal(4,1) DEFAULT NULL,
  `handicap_max` decimal(4,1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tee_id`),
  UNIQUE KEY `unique_tee_per_course` (`course_id`,`tee_type`),
  KEY `idx_course_tee_type` (`course_id`,`tee_type`),
  KEY `idx_gender_handicap` (`gender`,`handicap_min`,`handicap_max`),
  CONSTRAINT `course_tees_backup_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `golf_courses` (`course_id`) ON DELETE CASCADE,
  CONSTRAINT `course_tees_backup_chk_1` CHECK ((`slope_rating` between 55 and 155))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_tees_backup`
--

LOCK TABLES `course_tees_backup` WRITE;
/*!40000 ALTER TABLE `course_tees_backup` DISABLE KEYS */;
INSERT INTO `course_tees_backup` VALUES (1,1,'negro','Profesional',135,74.2,72,6800,'M',NULL,0.0,1,'2025-08-25 11:36:41','2025-08-25 11:36:41'),(2,1,'azul','Caballeros HCP Bajo',130,72.8,72,6400,'M',0.1,10.0,1,'2025-08-25 11:36:41','2025-08-25 11:36:41'),(3,1,'blanco','Caballeros HCP Medio/Alto',125,71.5,72,6000,'M',10.1,NULL,1,'2025-08-25 11:36:41','2025-08-25 11:36:41'),(4,1,'amarillo','Seniors/Juveniles',120,70.2,72,5600,'both',NULL,NULL,1,'2025-08-25 11:36:41','2025-08-25 11:36:41'),(5,1,'rojo','Damas',118,69.8,72,5200,'F',NULL,NULL,1,'2025-08-25 11:36:41','2025-08-25 11:36:41');
/*!40000 ALTER TABLE `course_tees_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empty_tournament_groups`
--

DROP TABLE IF EXISTS `empty_tournament_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empty_tournament_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `group_number` int NOT NULL,
  `starting_hole` int DEFAULT '1',
  `tee_time` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tournament_group` (`tournament_id`,`group_number`),
  CONSTRAINT `empty_tournament_groups_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empty_tournament_groups`
--

LOCK TABLES `empty_tournament_groups` WRITE;
/*!40000 ALTER TABLE `empty_tournament_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `empty_tournament_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `external_players`
--

DROP TABLE IF EXISTS `external_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `external_players` (
  `external_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `handicap_index` decimal(4,1) DEFAULT '0.0',
  `home_club` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `handicap_local` int DEFAULT '0' COMMENT 'Handicap local del jugador externo',
  `member_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Número de matrícula del club de origen',
  PRIMARY KEY (`external_id`),
  UNIQUE KEY `unique_email` (`email`),
  KEY `idx_full_name` (`full_name`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `external_players`
--

LOCK TABLES `external_players` WRITE;
/*!40000 ALTER TABLE `external_players` DISABLE KEYS */;
INSERT INTO `external_players` VALUES (9,'Merele Rosana',NULL,NULL,20.4,'Goya Golf Club',NULL,'2025-08-27 12:09:49','2025-08-28 18:01:16',23,'167213'),(10,'Diego Brest',NULL,NULL,18.7,'Goya Golf Club',NULL,'2025-08-27 12:17:12','2025-08-28 17:58:36',19,'174345'),(11,'Vicente Briglia',NULL,NULL,15.5,'Goya Golf Club',NULL,'2025-08-27 12:17:50','2025-08-28 18:02:52',17,'170164'),(12,'Rafael Espinoza',NULL,NULL,3.4,'Goya Golf Club',NULL,'2025-08-27 12:18:16','2025-08-28 18:02:31',2,'152245'),(13,'Federico Fleita',NULL,NULL,19.9,'Goya Golf Club',NULL,'2025-08-27 12:24:16','2025-08-28 17:59:48',23,'178429'),(14,'Adrian Godoy',NULL,NULL,7.3,'Goya Golf Club',NULL,'2025-08-27 13:39:36','2025-08-28 17:55:26',9,'123929'),(15,'Esteban Insaurrualde',NULL,NULL,8.5,'Goya Golf Club',NULL,'2025-08-27 13:40:11','2025-08-28 17:59:20',10,'93992'),(16,'Juan Insaurrualde',NULL,NULL,3.6,'Goya Golf Club',NULL,'2025-08-27 13:40:40','2025-08-28 18:00:08',5,'45316'),(17,'Martin Insaurrualde',NULL,NULL,5.3,'Goya Golf Club',NULL,'2025-08-27 13:41:13','2025-08-28 18:00:52',7,'41098'),(18,'Pablo Lomonaco',NULL,NULL,17.6,'Goya Golf Club',NULL,'2025-08-27 13:41:58','2025-08-28 18:02:01',20,'173681'),(19,'Diego Rodriguez',NULL,NULL,11.2,'Goya Golf Club',NULL,'2025-08-27 13:42:44','2025-08-28 17:59:02',11,'88657'),(20,'Juan Roubineau',NULL,NULL,18.3,'Goya Golf Club',NULL,'2025-08-27 13:43:20','2025-08-28 18:00:31',21,'107579'),(21,'Adrian Santajuliana',NULL,NULL,16.3,'Goya Golf Club',NULL,'2025-08-29 10:19:57','2025-08-29 10:19:57',19,'171538');
/*!40000 ALTER TABLE `external_players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `golf_courses`
--

DROP TABLE IF EXISTS `golf_courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `golf_courses` (
  `course_id` int NOT NULL AUTO_INCREMENT,
  `club_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'America/Argentina/Buenos_Aires',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'ARS',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `par` int DEFAULT '72',
  `physical_holes` int DEFAULT '18' COMMENT 'Physical holes on the course (9 or 18)',
  `max_members` int DEFAULT NULL,
  `current_members` int DEFAULT '0',
  `subscription_status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `subscription_start` date DEFAULT NULL,
  `subscription_end` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `slope_rating` int DEFAULT '113' COMMENT 'Slope rating for HCP calculation (55-155)',
  `course_rating` decimal(4,1) DEFAULT '72.0' COMMENT 'Course rating for HCP calculation',
  PRIMARY KEY (`course_id`),
  UNIQUE KEY `club_code` (`club_code`),
  KEY `idx_club_code` (`club_code`),
  KEY `idx_subscription_status` (`subscription_status`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `golf_courses`
--

LOCK TABLES `golf_courses` WRITE;
/*!40000 ALTER TABLE `golf_courses` DISABLE KEYS */;
INSERT INTO `golf_courses` VALUES (1,'SJRGC','San Jeronimo del Rey Golf Club','Raul Carussi 2133','Reconquista','AR','America/Argentina/Buenos_Aires','ARS','+54 11 1234-5678',NULL,'https://www.lospinos.com.ar',NULL,72,18,NULL,0,'active','2024-01-01',NULL,1,1,'2025-08-18 18:58:29','2025-08-31 02:19:23',113,72.0),(2,'TEST001','Club de Prueba MySQL ACTUALIZADO','Nueva Direcci�n 456','Nueva Ciudad','Argentina','America/Argentina/Buenos_Aires','ARS',NULL,NULL,NULL,NULL,72,18,NULL,0,'active','2025-08-18',NULL,0,1,'2025-08-18 19:02:17','2025-08-25 11:54:31',113,72.0),(4,'GGC','Goya Golf Club','por aca','Goya','AR','America/Argentina/Buenos_Aires','ARS',NULL,NULL,NULL,NULL,72,9,NULL,0,'active','2025-08-29',NULL,1,1,'2025-08-29 14:43:42','2025-08-29 14:43:42',113,72.0);
/*!40000 ALTER TABLE `golf_courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `members`
--

DROP TABLE IF EXISTS `members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `members` (
  `member_id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `member_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` enum('M','F','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `handicap_index` decimal(4,1) DEFAULT '0.0',
  `handicap_local` decimal(4,1) DEFAULT '0.0',
  `membership_type` enum('full','associate','junior','guest') COLLATE utf8mb4_unicode_ci DEFAULT 'full',
  `membership_status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `emergency_contact` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `unique_member_per_club` (`course_id`,`member_number`),
  KEY `idx_phone` (`phone`),
  KEY `idx_email` (`email`),
  KEY `idx_membership_status` (`membership_status`),
  KEY `idx_course_id` (`course_id`),
  CONSTRAINT `members_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `golf_courses` (`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=605 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `members`
--

LOCK TABLES `members` WRITE;
/*!40000 ALTER TABLE `members` DISABLE KEYS */;
INSERT INTO `members` VALUES (505,1,'69840','Adrian Emilio','Nardelli',NULL,'',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(506,1,NULL,'Agustin Adrian','Zilli',NULL,'3482205906',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(507,1,NULL,'Agustin','Lopez',NULL,'3482392565',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(508,1,NULL,'Agustin','Martyn',NULL,'3482414033',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(509,1,'177917','Agustin','Nardelli',NULL,'3482312697',NULL,NULL,17.2,20.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(510,1,'64090','Alba','Giasnecchi',NULL,'3482416111',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(511,1,'47541','Alberto','Leguizamon',NULL,'3482457302',NULL,NULL,6.9,9.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(512,1,'91905','Alejandro Gonzalo','Rodriguez',NULL,'3482416500',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(513,1,NULL,'Alejandro','Veron',NULL,'3482218552',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(514,1,'185940','Andres','Gomez',NULL,'3482515962',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(515,1,'134988','Ariel','Basabilbaso',NULL,'3482516277',NULL,NULL,17.9,21.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(516,1,'183059','Bruno','Nardelli',NULL,'3482630126',NULL,NULL,16.5,20.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(517,1,NULL,'Bruno','Zupel',NULL,'3482671282',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(518,1,'120417','Carlos','Calandra',NULL,'3482441254',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(519,1,'87348','Carlos','Nardelli',NULL,'3482635659',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(520,1,'73743','Cesar Daniel','Prado',NULL,'3482584532',NULL,NULL,24.3,29.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(521,1,'95528','Chan Sik Gregorio','Choi',NULL,'3482443088',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(522,1,'87349','Cristian','Padoan',NULL,'3482632318',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(523,1,'111234','Cristian','Pighin',NULL,'3482540078',NULL,NULL,6.7,8.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(524,1,'108616','Daniel','Ballore',NULL,'',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(525,1,'152349','Danilo Javier','Cian',NULL,'3482644521',NULL,NULL,10.5,13.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(526,1,'55898','Dante','Herrera',NULL,'3482568331',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(527,1,'111782','Eduardo','Torterola',NULL,'3482448633',NULL,NULL,10.5,13.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(528,1,'139972','Emanuel','Marcon',NULL,'3482534601',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(529,1,'50790','Emilio','Nardelli',NULL,'3482541443',NULL,NULL,12.2,15.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(530,1,NULL,'Fabricio','Aquino',NULL,'3482686032',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(531,1,NULL,'Fernandez','Fabio',NULL,'',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(532,1,'55713','Fernando Carlos','Cripovich',NULL,'543482581707',NULL,NULL,18.0,21.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(533,1,'117342','Francisco Raul','Cussit',NULL,'3482440566',NULL,NULL,6.0,0.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:35:21'),(534,1,'98641','Guillermo','Nardelli',NULL,'3482640888',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(535,1,'125472','Guillermo Romualdo','Romagnoli',NULL,'3482457648',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(536,1,'113985','Gustavo Alberto','Ortiz',NULL,'5490348215636740',NULL,NULL,-0.9,0.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(537,1,'103083','Gustavo Gilberto','Masat',NULL,'3482642355',NULL,NULL,6.2,8.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(538,1,'97797','Gustavo','Leguizamon',NULL,'3482250077',NULL,NULL,4.4,6.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(539,1,'67217','Gustavo','Martyn',NULL,'3482227570',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(540,1,'137292','Gustavo','Vera',NULL,'5493482646489',NULL,NULL,1.7,3.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-29 12:25:34'),(541,1,'152287','Hector','Centurión',NULL,'3482375634',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(542,1,'84627','Javier','Bieri','bierig31@gmail.com','543482668848',NULL,NULL,10.5,13.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(543,1,NULL,'Javier','Ortiz',NULL,'3482630719',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(544,1,'112964','Javier Roberto','Sartor',NULL,'3482414401',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(545,1,'102426','Jose','Celestino',NULL,'',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(546,1,NULL,'Jose Ign','Nardelli',NULL,'3482397140',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(547,1,'183058','Juan Castro','Videla',NULL,'15613051008',NULL,NULL,24.1,28.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(548,1,'114033','Juan De La Cruz','Pereyra',NULL,'3482570297',NULL,NULL,-0.6,0.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 17:48:37'),(549,1,'62555','Juan','Fernandez',NULL,'3482414600',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(550,1,'61019','Juan Pablo','Vicentin',NULL,'3482635899',NULL,NULL,5.4,7.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(551,1,NULL,'Juliana','Nardin',NULL,'5493482503708',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(552,1,'89296','Julio','Pagano',NULL,'3482457153',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(553,1,'124489','Leonardo Jose','Rassmusen',NULL,'549348215582964',NULL,NULL,7.1,9.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(554,1,'47542','Loubierejorge','Carlos',NULL,'3482577125',NULL,NULL,18.3,22.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(555,1,NULL,'Lucas Martin','Kaston',NULL,'3482263895',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(556,1,NULL,'Lucio','Audicio',NULL,'3482569387',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(557,1,'125473','Luis Fernando','Llarens',NULL,'3482538400',NULL,NULL,17.7,21.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(558,1,'100434','Marcelo','Crismanich',NULL,'3482370638',NULL,NULL,34.7,41.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(559,1,'183612','Marcelo','Paduan',NULL,'3482453144',NULL,NULL,36.5,43.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(560,1,'66947','Maria Eugenia','Chapero',NULL,'3482583273',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(561,1,NULL,'Maria Fabiana','Tarletta','fabi_tarle@hotmail.com','+54 9 1165784286',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(562,1,'99632','Mario','Oehrli',NULL,'3482574298',NULL,NULL,14.9,18.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(563,1,'47539','Martin Abel','Rios',NULL,'3482616750',NULL,NULL,6.9,9.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-27 10:36:57'),(564,1,NULL,'Martin','Chesa',NULL,'3482622955',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(565,1,NULL,'Martin','Ciepilak',NULL,'3482668957',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:21','2025-08-30 18:43:36'),(566,1,'57841','Martin','Colombo',NULL,'3482237449',NULL,NULL,21.6,0.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:35:22'),(567,1,'186105','Mauricio','Nardelli','mauricionardelli@gmail.com','3482203217',NULL,NULL,22.6,27.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(568,1,'80961','Mauro','Casella',NULL,'3413302153',NULL,NULL,25.0,29.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(569,1,'155558','Mauro','Marega',NULL,'3482551601',NULL,NULL,15.8,19.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(570,1,'86728','Maximo','Padoan',NULL,'3482630207',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(571,1,'59213','Miguel','Colombo',NULL,'3482639404',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(572,1,'89697','Moises Luis','Mansur',NULL,'3482440679',NULL,NULL,20.9,25.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(573,1,'111783','Omar','Zamer',NULL,'3482559434',NULL,NULL,11.0,13.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(574,1,NULL,'Paul Mario','Ignacio',NULL,'3482616892',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(575,1,'32240','Paula','Loretani',NULL,'3482636006',NULL,NULL,16.0,18.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(576,1,'94878','Paulo','Nardelli',NULL,'3482523426',NULL,NULL,13.4,16.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(577,1,'140528','Renato','Audicio',NULL,'3482626186',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(578,1,'131411','Rene','Scheidegger',NULL,'3482442450',NULL,NULL,19.8,23.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(579,1,'177618','Ricardo','Masat',NULL,'3482636572',NULL,NULL,20.3,24.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(580,1,NULL,'Rodrigo Gaston','Bolzan',NULL,'3482300724',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(581,1,NULL,'Rossier Tomas','Jose',NULL,'',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(582,1,'111233','Sandro','Nobile',NULL,'3482582049',NULL,NULL,34.9,41.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-27 10:36:57'),(583,1,'171788','Santiago','Vicentin',NULL,'3482535043',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(584,1,'95733','Sergio','Vicentin',NULL,'3482630205',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(585,1,NULL,'Tomas','Celestino',NULL,'3482208036',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(586,1,'170621','Valeria','Perez','valeriaperezsol@gmail.com','543482626157',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(587,1,'67783','Villa Ricardo','Sanchez',NULL,'3482553613',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(588,1,NULL,'Virginia','Tanino',NULL,'5493482505611',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-27 10:35:22','2025-08-30 18:43:36'),(589,1,NULL,'Eduardo','Ciepielak',NULL,'',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 10:22:25','2025-08-30 18:43:36'),(590,1,NULL,'Dardo','Insaurralde',NULL,'',NULL,NULL,0.0,NULL,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 10:49:01','2025-08-30 18:43:36'),(592,4,'123929','Adrian','Godoy','','',NULL,NULL,7.3,9.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(593,4,'171538','Adrian','Santajuliana','','',NULL,NULL,16.3,19.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(594,4,'174345','Diego','Brest','','',NULL,NULL,18.7,19.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(595,4,'88657','Diego','Rodriguez','','',NULL,NULL,11.2,11.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(596,4,'93992','Esteban','Insaurrualde','','',NULL,NULL,8.5,10.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(597,4,'178429','Federico','Fleita','','',NULL,NULL,19.9,23.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(598,4,'45316','Juan','Insaurrualde','','',NULL,NULL,3.6,5.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(599,4,'107579','Juan','Roubineau','','',NULL,NULL,18.3,21.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(600,4,'41098','Martin','Insaurrualde','','',NULL,NULL,5.3,7.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(601,4,'167213','Merele','Rosana','','',NULL,NULL,20.4,23.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(602,4,'173681','Pablo','Lomonaco','','',NULL,NULL,17.6,20.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(603,4,'152245','Rafael','Espinoza','','',NULL,NULL,3.4,2.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04'),(604,4,'170164','Vicente','Briglia','','',NULL,NULL,15.5,17.0,'full','active',NULL,NULL,NULL,1,NULL,'2025-08-29 14:51:04','2025-08-29 14:51:04');
/*!40000 ALTER TABLE `members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scorecard_holes`
--

DROP TABLE IF EXISTS `scorecard_holes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scorecard_holes` (
  `hole_id` int NOT NULL AUTO_INCREMENT,
  `scorecard_id` int NOT NULL,
  `hole_number` int NOT NULL,
  `par` int DEFAULT '4',
  `strokes` int NOT NULL,
  `hole_handicap` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`hole_id`),
  UNIQUE KEY `unique_scorecard_hole` (`scorecard_id`,`hole_number`),
  KEY `idx_scorecard_id` (`scorecard_id`),
  KEY `idx_hole_number` (`hole_number`),
  CONSTRAINT `scorecard_holes_ibfk_1` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE CASCADE,
  CONSTRAINT `scorecard_holes_chk_1` CHECK ((`hole_number` between 1 and 18)),
  CONSTRAINT `scorecard_holes_chk_2` CHECK ((`par` between 3 and 6)),
  CONSTRAINT `scorecard_holes_chk_3` CHECK ((`strokes` between 1 and 15))
) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scorecard_holes`
--

LOCK TABLES `scorecard_holes` WRITE;
/*!40000 ALTER TABLE `scorecard_holes` DISABLE KEYS */;
INSERT INTO `scorecard_holes` VALUES (55,13,1,4,4,0,'2025-09-01 20:02:38'),(56,13,2,4,4,0,'2025-09-01 20:02:38'),(57,13,3,4,5,0,'2025-09-01 20:02:38'),(58,13,4,4,3,0,'2025-09-01 20:02:38'),(59,13,5,4,4,0,'2025-09-01 20:02:38'),(60,13,6,4,5,0,'2025-09-01 20:02:38'),(61,13,7,4,6,0,'2025-09-01 20:02:38'),(62,13,8,4,6,0,'2025-09-01 20:02:38'),(63,13,9,4,5,0,'2025-09-01 20:02:38'),(64,13,10,4,5,0,'2025-09-01 20:02:38'),(65,13,11,4,4,0,'2025-09-01 20:02:38'),(66,13,12,4,3,0,'2025-09-01 20:02:38'),(67,13,13,4,4,0,'2025-09-01 20:02:38'),(68,13,14,4,5,0,'2025-09-01 20:02:38'),(69,13,15,4,6,0,'2025-09-01 20:02:38'),(70,13,16,4,5,0,'2025-09-01 20:02:38'),(71,13,17,4,4,0,'2025-09-01 20:02:38'),(72,13,18,4,3,0,'2025-09-01 20:02:38'),(73,19,1,4,3,0,'2025-09-01 20:15:45'),(74,19,2,4,4,0,'2025-09-01 20:15:45'),(75,19,3,4,3,0,'2025-09-01 20:15:45'),(76,19,4,4,4,0,'2025-09-01 20:15:45'),(77,19,5,4,5,0,'2025-09-01 20:15:45'),(78,19,6,4,5,0,'2025-09-01 20:15:45'),(79,19,7,4,6,0,'2025-09-01 20:15:45'),(80,19,8,4,6,0,'2025-09-01 20:15:45'),(81,19,9,4,6,0,'2025-09-01 20:15:45'),(82,19,10,4,7,0,'2025-09-01 20:15:45'),(83,19,11,4,7,0,'2025-09-01 20:15:45'),(84,19,12,4,7,0,'2025-09-01 20:15:45'),(85,19,13,4,4,0,'2025-09-01 20:15:45'),(86,19,14,4,3,0,'2025-09-01 20:15:45'),(87,19,15,4,3,0,'2025-09-01 20:15:45'),(88,19,16,4,3,0,'2025-09-01 20:15:45'),(89,19,17,4,3,0,'2025-09-01 20:15:45'),(90,19,18,4,3,0,'2025-09-01 20:15:45'),(91,20,1,4,3,0,'2025-09-01 20:17:50'),(92,20,2,4,4,0,'2025-09-01 20:17:50'),(93,20,3,4,3,0,'2025-09-01 20:17:50'),(94,20,4,4,4,0,'2025-09-01 20:17:50'),(95,20,5,4,3,0,'2025-09-01 20:17:50'),(96,20,6,4,4,0,'2025-09-01 20:17:50'),(97,20,7,4,3,0,'2025-09-01 20:17:50'),(98,20,8,4,4,0,'2025-09-01 20:17:50'),(99,20,9,4,3,0,'2025-09-01 20:17:50'),(100,20,10,4,4,0,'2025-09-01 20:17:50'),(101,20,11,4,3,0,'2025-09-01 20:17:50'),(102,20,12,4,4,0,'2025-09-01 20:17:50'),(103,20,13,4,3,0,'2025-09-01 20:17:50'),(104,20,14,4,4,0,'2025-09-01 20:17:50'),(105,20,15,4,3,0,'2025-09-01 20:17:50'),(106,20,16,4,4,0,'2025-09-01 20:17:50'),(107,20,17,4,3,0,'2025-09-01 20:17:50'),(108,20,18,4,4,0,'2025-09-01 20:17:50');
/*!40000 ALTER TABLE `scorecard_holes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scorecard_photos`
--

DROP TABLE IF EXISTS `scorecard_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scorecard_photos` (
  `photo_id` int NOT NULL AUTO_INCREMENT,
  `scorecard_id` int NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ocr_status` enum('pending','processing','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `ocr_data` json DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`photo_id`),
  KEY `idx_scorecard_id` (`scorecard_id`),
  KEY `idx_ocr_status` (`ocr_status`),
  CONSTRAINT `scorecard_photos_ibfk_1` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scorecard_photos`
--

LOCK TABLES `scorecard_photos` WRITE;
/*!40000 ALTER TABLE `scorecard_photos` DISABLE KEYS */;
/*!40000 ALTER TABLE `scorecard_photos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scorecards`
--

DROP TABLE IF EXISTS `scorecards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scorecards` (
  `scorecard_id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `member_id` int DEFAULT NULL,
  `external_player_id` int DEFAULT NULL,
  `course_id` int NOT NULL,
  `total_gross` int DEFAULT '0',
  `total_net` int DEFAULT '0',
  `front_nine` int DEFAULT '0',
  `back_nine` int DEFAULT '0',
  `holes_completed` int DEFAULT '0',
  `entry_method` enum('manual','mobile','photo','import') COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `verified_card` tinyint(1) DEFAULT '0',
  `original_archived` tinyint(1) DEFAULT '0',
  `entry_notes` text COLLATE utf8mb4_unicode_ci,
  `entered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`scorecard_id`),
  UNIQUE KEY `unique_tournament_member` (`tournament_id`,`member_id`),
  UNIQUE KEY `unique_tournament_external` (`tournament_id`,`external_player_id`),
  KEY `idx_tournament_id` (`tournament_id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_external_player_id` (`external_player_id`),
  KEY `idx_course_id` (`course_id`),
  KEY `idx_total_gross` (`total_gross`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `scorecards_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`) ON DELETE CASCADE,
  CONSTRAINT `scorecards_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `golf_courses` (`course_id`) ON DELETE CASCADE,
  CONSTRAINT `scorecards_ibfk_3` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE,
  CONSTRAINT `scorecards_ibfk_4` FOREIGN KEY (`external_player_id`) REFERENCES `external_players` (`external_id`) ON DELETE CASCADE,
  CONSTRAINT `scorecards_chk_1` CHECK ((((`member_id` is not null) and (`external_player_id` is null)) or ((`member_id` is null) and (`external_player_id` is not null))))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scorecards`
--

LOCK TABLES `scorecards` WRITE;
/*!40000 ALTER TABLE `scorecards` DISABLE KEYS */;
INSERT INTO `scorecards` VALUES (13,7,547,NULL,1,81,0,42,39,18,'manual',1,0,'',NULL,'2025-08-30 22:43:34','2025-09-01 20:02:38'),(19,7,507,NULL,1,82,0,42,40,18,'manual',1,0,'',NULL,'2025-09-01 20:15:45','2025-09-01 20:15:45'),(20,7,589,NULL,1,63,0,31,32,18,'manual',1,0,'',NULL,'2025-09-01 20:17:50','2025-09-01 20:17:50');
/*!40000 ALTER TABLE `scorecards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `setting_id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `setting_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_public` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `idx_setting_key` (`setting_key`),
  KEY `idx_is_public` (`is_public`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'app_name','TeeTracker Pro','string','Application name',1,'2025-08-18 18:58:29','2025-08-18 18:58:29'),(2,'app_version','1.0.0','string','Application version',1,'2025-08-18 18:58:29','2025-08-18 18:58:29'),(3,'default_timezone','America/Argentina/Buenos_Aires','string','Default timezone',0,'2025-08-18 18:58:29','2025-08-18 18:58:29'),(4,'default_currency','ARS','string','Default currency',0,'2025-08-18 18:58:29','2025-08-18 18:58:29'),(5,'max_handicap','54.0','number','Maximum handicap allowed',1,'2025-08-18 18:58:29','2025-08-18 18:58:29'),(6,'min_handicap','-10.0','number','Minimum handicap allowed',1,'2025-08-18 18:58:29','2025-08-18 18:58:29');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_participants`
--

DROP TABLE IF EXISTS `tournament_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_participants` (
  `participation_id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `member_id` int DEFAULT NULL,
  `group_number` int DEFAULT NULL,
  `tee_time` time DEFAULT NULL,
  `starting_hole` int DEFAULT '1',
  `handicap_used` decimal(4,1) DEFAULT NULL,
  `registration_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_status` enum('pending','paid','refunded') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `status` enum('registered','confirmed','no_show','disqualified') COLLATE utf8mb4_unicode_ci DEFAULT 'registered',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `external_player_id` int DEFAULT NULL,
  `player_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `player_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `player_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `player_club` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `player_type` enum('member','external') COLLATE utf8mb4_unicode_ci DEFAULT 'member',
  PRIMARY KEY (`participation_id`),
  UNIQUE KEY `unique_member_per_tournament` (`tournament_id`,`member_id`),
  UNIQUE KEY `unique_external_per_tournament` (`tournament_id`,`external_player_id`),
  KEY `idx_tournament_id` (`tournament_id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_group_number` (`group_number`),
  KEY `idx_tee_time` (`tee_time`),
  KEY `idx_external_player_id` (`external_player_id`),
  KEY `idx_player_type` (`player_type`),
  CONSTRAINT `tournament_participants_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_participants_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_participants_ibfk_3` FOREIGN KEY (`external_player_id`) REFERENCES `external_players` (`external_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=160 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_participants`
--

LOCK TABLES `tournament_participants` WRITE;
/*!40000 ALTER TABLE `tournament_participants` DISABLE KEYS */;
INSERT INTO `tournament_participants` VALUES (60,7,509,8,'14:00:00',8,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(61,7,511,4,'14:00:00',4,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(62,7,515,9,'14:00:00',9,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(63,7,516,8,'14:00:00',8,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(64,7,520,11,'08:00:00',2,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(65,7,523,3,'14:00:00',3,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(66,7,525,5,'14:00:00',5,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(67,7,527,5,'14:00:00',5,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(68,7,529,6,'14:00:00',6,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(69,7,532,9,'14:00:00',9,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(70,7,536,1,'14:00:00',1,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(71,7,537,3,'14:00:00',3,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(72,7,538,2,'14:00:00',2,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(73,7,540,1,'14:00:00',1,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(74,7,542,5,'14:00:00',5,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(75,7,547,11,'08:00:00',2,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(76,7,548,1,'14:00:00',1,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(77,7,550,2,'14:00:00',2,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(78,7,553,3,'14:00:00',3,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(79,7,554,9,'14:00:00',9,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(80,7,557,9,'14:00:00',9,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(81,7,558,12,'08:00:00',3,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(82,7,559,12,'08:00:00',3,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(83,7,562,7,'14:00:00',7,NULL,'2025-08-27 11:43:37','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(84,7,563,4,'14:00:00',4,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(85,7,567,11,'08:00:00',2,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(86,7,568,12,'08:00:00',3,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(87,7,569,7,'14:00:00',7,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(88,7,572,11,'08:00:00',2,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(89,7,573,5,'14:00:00',5,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(90,7,575,6,'14:00:00',6,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(91,7,576,6,'14:00:00',6,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(92,7,578,10,'14:30:00',1,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(93,7,579,10,'14:30:00',1,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(94,7,582,12,'08:00:00',3,NULL,'2025-08-27 11:43:38','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(127,7,NULL,8,'14:00:00',8,NULL,'2025-08-29 09:57:00','pending','confirmed',NULL,20,'Juan Roubineau',NULL,NULL,'Goya Golf Club','external'),(128,7,NULL,1,'14:00:00',1,NULL,'2025-08-29 09:57:21','pending','confirmed',NULL,12,'Rafael Espinoza',NULL,NULL,'Goya Golf Club','external'),(129,7,NULL,6,'14:00:00',6,NULL,'2025-08-29 09:57:21','pending','confirmed',NULL,11,'Vicente Briglia',NULL,NULL,'Goya Golf Club','external'),(130,7,NULL,3,'14:00:00',3,NULL,'2025-08-29 09:58:28','pending','confirmed',NULL,14,'Adrian Godoy',NULL,NULL,'Goya Golf Club','external'),(131,7,NULL,7,'14:00:00',7,NULL,'2025-08-29 09:58:28','pending','confirmed',NULL,10,'Diego Brest',NULL,NULL,'Goya Golf Club','external'),(132,7,NULL,4,'14:00:00',4,NULL,'2025-08-29 09:58:28','pending','confirmed',NULL,19,'Diego Rodriguez',NULL,NULL,'Goya Golf Club','external'),(133,7,NULL,4,'14:00:00',4,NULL,'2025-08-29 09:58:28','pending','confirmed',NULL,15,'Esteban Insaurrualde',NULL,NULL,'Goya Golf Club','external'),(134,7,NULL,10,'14:30:00',1,NULL,'2025-08-29 09:58:28','pending','confirmed',NULL,13,'Federico Fleita',NULL,NULL,'Goya Golf Club','external'),(135,7,NULL,2,'14:00:00',2,NULL,'2025-08-29 09:58:28','pending','confirmed',NULL,16,'Juan Insaurrualde',NULL,NULL,'Goya Golf Club','external'),(136,7,NULL,2,'14:00:00',2,NULL,'2025-08-29 09:58:28','pending','confirmed',NULL,17,'Martin Insaurrualde',NULL,NULL,'Goya Golf Club','external'),(137,7,NULL,10,'14:30:00',1,NULL,'2025-08-29 09:58:28','pending','confirmed',NULL,9,'Merele Rosana',NULL,NULL,'Goya Golf Club','external'),(138,7,NULL,8,'14:00:00',8,NULL,'2025-08-29 09:58:28','pending','confirmed',NULL,18,'Pablo Lomonaco',NULL,NULL,'Goya Golf Club','external'),(139,7,NULL,7,'14:00:00',7,NULL,'2025-08-29 10:20:01','pending','confirmed',NULL,21,'Adrian Santajuliana',NULL,NULL,'Goya Golf Club','external'),(140,7,507,14,'14:30:00',5,NULL,'2025-08-29 11:52:58','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(141,7,519,13,'14:30:00',4,NULL,'2025-08-29 11:52:58','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(142,7,590,13,'14:30:00',4,NULL,'2025-08-29 11:52:58','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(143,7,589,14,'14:30:00',5,NULL,'2025-08-29 11:52:58','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(144,7,534,13,'14:30:00',4,NULL,'2025-08-29 11:52:58','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(145,7,546,13,'14:30:00',4,NULL,'2025-08-29 11:52:58','pending','confirmed',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(146,8,592,NULL,NULL,1,9.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(147,8,593,NULL,NULL,1,19.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(148,8,594,NULL,NULL,1,19.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(149,8,595,NULL,NULL,1,11.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(150,8,596,NULL,NULL,1,10.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(151,8,597,NULL,NULL,1,23.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(152,8,598,NULL,NULL,1,5.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(153,8,599,NULL,NULL,1,21.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(154,8,600,NULL,NULL,1,7.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(155,8,601,NULL,NULL,1,23.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(156,8,602,NULL,NULL,1,20.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(157,8,603,NULL,NULL,1,2.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member'),(158,8,604,NULL,NULL,1,17.0,'2025-08-29 14:55:04','pending','registered',NULL,NULL,NULL,NULL,NULL,NULL,'member');
/*!40000 ALTER TABLE `tournament_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournaments` (
  `tournament_id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `tournament_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tournament_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `tournament_type` enum('stroke_play','match_play','scramble','best_ball') COLLATE utf8mb4_unicode_ci DEFAULT 'stroke_play',
  `max_participants` int DEFAULT NULL,
  `registration_deadline` datetime DEFAULT NULL,
  `entry_fee` decimal(10,2) DEFAULT '0.00',
  `prize_pool` decimal(10,2) DEFAULT '0.00',
  `description` text COLLATE utf8mb4_unicode_ci,
  `rules` text COLLATE utf8mb4_unicode_ci,
  `status` enum('draft','open','closed','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `weather_conditions` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tournament_id`),
  KEY `idx_tournament_date` (`tournament_date`),
  KEY `idx_status` (`status`),
  KEY `idx_course_id` (`course_id`),
  CONSTRAINT `tournaments_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `golf_courses` (`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
INSERT INTO `tournaments` VALUES (7,1,'4to Clasificatorio Club San Jeronimo del Rey','2025-08-30','08:00:00','18:00:00','stroke_play',120,'2025-08-29 00:00:00',35000.00,0.00,NULL,NULL,'draft',NULL,NULL,'2025-08-27 11:16:04','2025-08-27 11:16:04'),(8,4,'Copa Goya','2025-08-30','08:00:00','18:00:00','stroke_play',120,'2025-08-29 00:00:00',0.00,0.00,NULL,NULL,'draft',NULL,NULL,'2025-08-29 14:54:53','2025-08-29 14:54:53');
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-24  9:29:29
