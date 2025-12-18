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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-18  5:16:52
