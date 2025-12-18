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
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permissions` (
  `permission_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `can_view_members` tinyint(1) DEFAULT '1',
  `can_view_tournaments` tinyint(1) DEFAULT '1',
  `can_view_groups` tinyint(1) DEFAULT '1',
  `can_view_scorecards` tinyint(1) DEFAULT '1',
  `can_view_photos` tinyint(1) DEFAULT '1',
  `can_view_settings` tinyint(1) DEFAULT '0',
  `can_view_rankings` tinyint(1) DEFAULT '1',
  `can_view_accounting` tinyint(1) DEFAULT '0',
  `can_create_members` tinyint(1) DEFAULT '1',
  `can_edit_members` tinyint(1) DEFAULT '1',
  `can_delete_members` tinyint(1) DEFAULT '0',
  `can_create_tournaments` tinyint(1) DEFAULT '1',
  `can_edit_tournaments` tinyint(1) DEFAULT '1',
  `can_delete_tournaments` tinyint(1) DEFAULT '0',
  `can_manage_participants` tinyint(1) DEFAULT '1',
  `can_manage_groups` tinyint(1) DEFAULT '1',
  `can_manage_scorecards` tinyint(1) DEFAULT '1',
  `can_manage_payments` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_id`),
  KEY `idx_admin_permissions` (`admin_id`),
  CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `club_administrators` (`admin_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permissions`
--

LOCK TABLES `user_permissions` WRITE;
/*!40000 ALTER TABLE `user_permissions` DISABLE KEYS */;
INSERT INTO `user_permissions` VALUES (1,7,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,'2025-12-15 20:33:26','2025-12-15 20:33:26'),(2,8,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0,1,0,'2025-12-15 20:40:38','2025-12-15 22:03:22'),(3,8,0,1,1,1,0,0,1,1,0,0,0,0,1,0,1,1,1,1,'2025-12-15 22:31:02','2025-12-15 22:31:02'),(4,8,0,1,1,1,0,0,1,1,0,0,0,0,1,0,1,1,1,1,'2025-12-15 22:33:27','2025-12-15 22:33:27');
/*!40000 ALTER TABLE `user_permissions` ENABLE KEYS */;
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
