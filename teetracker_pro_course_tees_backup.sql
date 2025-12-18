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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-18  5:16:53
