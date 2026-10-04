# Cyber Threat Detection Security Analytics

## Project Overview

Cyber Threat Detection Security Analytics is a real-time cybersecurity monitoring and threat detection system designed to identify malicious network traffic and monitor security-related activities on a web application.

The system combines Machine Learning, real-time network traffic capture, backend APIs, MySQL database logging, and a web-based security dashboard.

The machine learning layer uses Random Forest, XGBoost, and a 50:50 Hybrid Classifier to classify network traffic into 15 different classes.

The system also includes website security monitoring features such as:

- Login attempt monitoring
- Successful login monitoring
- Failed login monitoring
- Multiple failed login detection
- API request monitoring
- Repeated API request detection
- Suspicious login activity based on different IP addresses
- Real-time security event logging

The project is integrated with the NexaoraNotes educational website. Normal users can access the website, while administrators can access the Cyber Threat Detection Security Analytics dashboard.

---

## Project Objectives

The main objectives of this project are:

1. Detect malicious network traffic using Machine Learning.
2. Classify network traffic into multiple attack categories.
3. Combine Random Forest and XGBoost predictions using a Hybrid Classifier.
4. Capture live network traffic using Scapy.
5. Send extracted traffic features to the ML API.
6. Store prediction results in MySQL.
7. Display real-time prediction statistics on the dashboard.
8. Monitor website security events.
9. Detect repeated failed login attempts.
10. Detect repeated API requests.
11. Detect suspicious account activity from different IP addresses.
12. Provide a centralized security monitoring dashboard.

---

## Technology Stack

### Machine Learning

- Python
- Pandas
- NumPy
- Scikit-learn
- XGBoost
- Joblib
- Matplotlib
- Seaborn

### Dataset

- CICIDS2017 Dataset

### Network Traffic Capture

- Python
- Scapy
- Npcap

### ML API

- Flask
- Python

### Backend

- Node.js
- Express.js
- Axios
- MySQL

### Database

- MySQL
- MySQL Workbench

### Frontend

- HTML5
- CSS3
- JavaScript
- Chart.js

### Website Integration

- Node.js
- Express.js
- SQLite
- HTML
- CSS
- JavaScript

### Development Tools

- Visual Studio Code
- Git
- GitHub
- PowerShell

---

## System Architecture

```text
                         NEXAORANOTES
                              |
                              v
                         Login System
                              |
                  +-----------+-----------+
                  |                       |
                USER                    ADMIN
                  |                       |
                  v                       v
           NexaoraNotes          Cyber Security Dashboard
                                          |
                    +---------------------+---------------------+
                    |                     |                     |
                    v                     v                     v
              Live Traffic        Website Security        ML Detection
                    |                  Monitoring               |
                    v                     |                     |
                 Scapy                    v                     v
                    |              Login/API Events      Random Forest
                    |                                           +
                    |                                        XGBoost
                    |                                           |
                    +---------------------+---------------------+
                                          |
                                          v
                                    Flask ML API
                                       :8000
                                          |
                                          v
                                  Node.js Backend
                                       :5000
                                          |
                                          v
                                       MySQL
                                          |
                                          v
                                  Security Dashboard
                                       :5500