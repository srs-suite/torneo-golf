CREATE DATABASE  IF NOT EXISTS `teetracker_pro` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `teetracker_pro`;
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
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'ARS',
  `prize_pool` decimal(10,2) DEFAULT '0.00',
  `description` text COLLATE utf8mb4_unicode_ci,
  `rules` text COLLATE utf8mb4_unicode_ci,
  `status` enum('draft','open','closed','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `weather_conditions` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_ranking_event` tinyint(1) NOT NULL DEFAULT '0',
  `results_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standard',
  `separate_ladies` tinyint(1) NOT NULL DEFAULT '0',
  `ladies_by_hcp` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`tournament_id`),
  KEY `idx_tournament_date` (`tournament_date`),
  KEY `idx_status` (`status`),
  KEY `idx_course_id` (`course_id`),
  CONSTRAINT `tournaments_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `golf_courses` (`course_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
INSERT INTO `tournaments` VALUES (7,1,'4to Clasificatorio Club San Jeronimo del Rey','2025-08-30','08:00:00','18:00:00','stroke_play',120,'2025-08-29 00:00:00',35000.00,'ARS',0.00,NULL,NULL,'draft',NULL,NULL,'2025-08-27 11:16:04','2025-08-27 11:16:04',0,'standard',0,0),(8,4,'Copa Goya','2025-08-30','08:00:00','18:00:00','stroke_play',120,'2025-08-29 00:00:00',0.00,'ARS',0.00,NULL,NULL,'draft',NULL,NULL,'2025-08-29 14:54:53','2025-08-29 14:54:53',0,'standard',0,0),(9,1,'Torneo Amigos del green','2025-10-04',NULL,NULL,'stroke_play',120,NULL,0.00,'ARS',0.00,NULL,NULL,'draft',NULL,NULL,'2025-10-02 21:18:27','2025-12-13 12:57:36',0,'standard',0,0),(10,1,'Torneo Clausura Copa Comdetur','2025-12-13','07:30:00','19:00:00','stroke_play',200,NULL,40000.00,'ARS',0.00,NULL,NULL,'draft',NULL,NULL,'2025-12-12 15:56:07','2025-12-13 12:53:07',0,'scratch_bands',0,0);
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

-- Dump completed on 2025-12-18  5:16:54
