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
  `gender` enum('M','F','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `external_players` VALUES (9,'Merele Rosana',NULL,NULL,'M',20.4,'Goya Golf Club',NULL,'2025-08-27 12:09:49','2025-12-14 21:40:33',23,'167213'),(10,'Diego Brest',NULL,NULL,'M',18.7,'Goya Golf Club',NULL,'2025-08-27 12:17:12','2025-12-14 21:40:33',19,'174345'),(11,'Vicente Briglia',NULL,NULL,'M',15.5,'Goya Golf Club',NULL,'2025-08-27 12:17:50','2025-12-14 21:40:33',17,'170164'),(12,'Rafael Espinoza',NULL,NULL,'M',3.4,'Goya Golf Club',NULL,'2025-08-27 12:18:16','2025-12-14 21:40:33',2,'152245'),(13,'Federico Fleita',NULL,NULL,'M',19.9,'Goya Golf Club',NULL,'2025-08-27 12:24:16','2025-12-14 21:40:33',23,'178429'),(14,'Adrian Godoy',NULL,NULL,'M',7.3,'Goya Golf Club',NULL,'2025-08-27 13:39:36','2025-12-14 21:40:33',9,'123929'),(15,'Esteban Insaurrualde',NULL,NULL,'M',8.5,'Goya Golf Club',NULL,'2025-08-27 13:40:11','2025-12-14 21:40:33',10,'93992'),(16,'Juan Insaurrualde',NULL,NULL,'M',3.6,'Goya Golf Club',NULL,'2025-08-27 13:40:40','2025-12-14 21:40:33',5,'45316'),(17,'Martin Insaurrualde',NULL,NULL,'M',5.3,'Goya Golf Club',NULL,'2025-08-27 13:41:13','2025-12-14 21:40:33',7,'41098'),(18,'Pablo Lomonaco',NULL,NULL,'M',17.6,'Goya Golf Club',NULL,'2025-08-27 13:41:58','2025-12-14 21:40:33',20,'173681'),(19,'Diego Rodriguez',NULL,NULL,'M',11.2,'Goya Golf Club',NULL,'2025-08-27 13:42:44','2025-12-14 21:40:33',11,'88657'),(20,'Juan Roubineau',NULL,NULL,'M',18.3,'Goya Golf Club',NULL,'2025-08-27 13:43:20','2025-12-14 21:40:33',21,'107579'),(21,'Adrian Santajuliana',NULL,NULL,'M',16.3,'Goya Golf Club',NULL,'2025-08-29 10:19:57','2025-12-14 21:40:33',19,'171538');
/*!40000 ALTER TABLE `external_players` ENABLE KEYS */;
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
