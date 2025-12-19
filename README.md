# 🚀 Real-Time Competitive Quiz & Rewards Platform

A **scalable, event-driven backend system** for real-time competitive quizzes, battles, leaderboards, referrals, and reward redemption.  
Designed to handle **high traffic with zero data loss** using **Kafka-based asynchronous processing**.

---

## 📌 Overview

This platform enables users to:
- Participate in **real-time quizzes** across multiple categories
- Compete in **live battles** with random opponents worldwide
- Earn points and tokens through quizzes, battles, and referrals
- View **live leaderboards** with near-instant updates
- Redeem rewards such as **gift cards and mobile recharges**

The system was architected to support **high concurrency, low latency**, and **fault-tolerant event processing**.

---

## 🏗️ System Architecture (High Level)

- **Backend:** Node.js & Python (microservice-oriented)
- **Event Streaming:** Apache Kafka
- **Real-Time Data:** Redis
- **Databases:** Relational DB for persistence
- **Infrastructure:** AWS (EC2 + Serverless)
- **Communication:** REST APIs + WebSockets

> The platform transitioned from synchronous APIs to **Kafka-based event pipelines** after facing data loss under heavy traffic, ensuring reliable processing of high-frequency events.

---

## ⚙️ Core Modules

### 🔥 1. Competitive Battles
- Users are matched **randomly in real time** using WebSockets.
- Supports multiple battle categories (e.g., quizzes, creative challenges).
- Voting and battle interactions are processed via **Kafka** to handle spikes in traffic reliably.

---

### 🧠 2. Quiz Engine
- Multiple quiz categories (programming, entertainment, general knowledge, etc.).
- Real-time answer submission with asynchronous event processing.
- Designed for **high-throughput quiz participation**.

---

### 📊 3. Live Leaderboard
- Uses **Redis** for instant leaderboard updates.
- Asynchronous database updates ensure durability without affecting latency.
- Users see updated rankings within seconds.

---

### 🎁 4. Rewards & Redemption
- Token-based reward system for quizzes, battles, and referrals.
- Supports **gift cards and mobile recharges** via third-party integrations.
- Built a **retry and reconciliation mechanism** to handle success, failure, and in-progress transactions reliably.

---

### 🔗 5. Referral Program
- Users can refer friends and earn tokens.
- Referral events processed asynchronously to prevent fraud and ensure consistency.

---

## 🛠️ Admin CMS (Web-Based)

- Built using **React.js** for administrators.
- Features:
  - Quiz & question management
  - User activity monitoring
  - User blocking and moderation
  - Admin-to-user notifications and messaging

---

## 🚦 Event-Driven Design (Kafka)

Kafka is used for:
- Quiz submissions
- Battle votes
- Leaderboard updates
- Referral events
- Reward and redemption processing

### Why Kafka?
- Prevents **data loss during traffic spikes**
- Enables **horizontal scalability**
- Decouples user-facing APIs from backend processing
- Improves system reliability under high load

---

## 🚀 Deployment & Scalability

- Deployed across **AWS EC2 and Serverless services**
- Load-balanced services to handle concurrent users
- Designed for **minimal latency and high availability**
- Supports real-time interactions with thousands of active users

---

## 🧰 Tech Stack

- **Backend:** Node.js, Python  
- **Frontend (Admin):** React.js  
- **Streaming:** Apache Kafka  
- **Caching:** Redis  
- **Infrastructure:** AWS (EC2, Serverless)  
- **Architecture:** Event-Driven, Distributed Systems  

---

## 🎯 Key Engineering Highlights

- Migrated from synchronous APIs to **event-driven Kafka architecture** after production failures under load.
- Built **real-time systems** with Redis + async persistence.
- Designed for **scalability, fault tolerance, and low latency**.
- End-to-end backend ownership including architecture, deployment, and optimization.

---

## 📌 Notes

- This repository focuses on **backend architecture and admin CMS**.

---

## 👤 Author

Backend & Distributed Systems Engineer  
Focused on scalability, real-time systems, and event-driven architectures.
