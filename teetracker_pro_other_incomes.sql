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
-- Table structure for table `other_incomes`
--

DROP TABLE IF EXISTS `other_incomes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `other_incomes` (
  `income_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `member_id` int DEFAULT NULL,
  `income_date` date NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'ARS',
  `payment_type` enum('efectivo','transferencia','tarjeta','cheque','otro') COLLATE utf8mb4_unicode_ci DEFAULT 'efectivo',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`income_id`),
  KEY `idx_club_income_date` (`club_id`,`income_date`),
  KEY `idx_other_incomes_member` (`member_id`),
  CONSTRAINT `fk_other_incomes_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`member_id`) ON DELETE SET NULL,
  CONSTRAINT `other_incomes_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `other_incomes`
--

LOCK TABLES `other_incomes` WRITE;
/*!40000 ALTER TABLE `other_incomes` DISABLE KEYS */;
INSERT INTO `other_incomes` VALUES (1,1,NULL,'2025-12-13',1000000.00,'ARS','efectivo','Subasta Bolsa de golf','2025-12-15 20:10:20','2025-12-15 20:10:20'),(2,1,NULL,'2025-12-15',1576981.35,'ARS','efectivo','Fondos en poder del Club','2025-12-16 00:59:50','2025-12-16 01:29:08'),(3,1,NULL,'2025-12-15',110000.00,'ARS','efectivo','Saldo de la recaudacion para la reparacion del tractor','2025-12-16 01:31:41','2025-12-16 01:31:41'),(4,1,NULL,'2025-12-15',600.00,'USD','efectivo','Saldo de la recaudacion para la reparacion del tractor','2025-12-16 01:32:11','2025-12-16 01:32:11'),(5,1,547,'2025-12-17',50000.00,'ARS','efectivo','Bono para compra de maquina','2025-12-17 16:57:50','2025-12-17 16:57:50');
/*!40000 ALTER TABLE `other_incomes` ENABLE KEYS */;
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
