# 🎓 AI Student Consultant

An AI-powered academic support system that predicts student performance and provides personalized guidance based on lifestyle and study patterns — without using external AI APIs.

---

## 🚀 Overview

The **AI Student Consultant** is designed to analyze student data (study habits, sleep, mental health, etc.) and:

- 📊 Predict exam scores using Machine Learning  
- 💬 Provide personalized consultation via a local chatbot  
- 📈 Show performance trends and insights through dashboards  

This system focuses on **practical AI implementation**, not just theory.

---

## 🧠 Key Features

- 🔮 **Score Prediction**
  - Predicts exam performance using ML models (RandomForest / XGBoost)

- 💬 **AI Consultant (Chatbot)**
  - Retrieval-based chatbot using semantic similarity
  - No external APIs (fully local NLP)

- 📊 **Dashboard**
  - Latest prediction + history
  - Trend visualization (Chart.js)

- 🔁 **What-If Analysis**
  - Modify inputs and see impact instantly

- 🔐 **Authentication**
  - AWS Cognito (secure login system)

---

## 🏗️ System Architecture
Frontend (HTML/CSS/JS) → FastAPI Backend (Python) → ML Model + NLP Engine → PostgreSQL (Supabase) → AWS Services (Cognito, EC2, CloudFront)

---

## 🛠️ Tech Stack

### 👨‍💻 Backend
- FastAPI
- Python 3.11
- Scikit-learn / XGBoost
- Sentence-Transformers

### 🌐 Frontend
- HTML, CSS, JavaScript
- Chart.js

### 🗄️ Database
- PostgreSQL (Supabase)

### ☁️ Cloud
- AWS EC2 (Deployment)
- AWS Cognito (Auth)
- AWS CloudFront (Distribution)
