# 🚀 WordPress on AWS with CDK

# AWS Codepiple added

This repository contains AWS CDK stacks that build a **highly available** and **scalable** WordPress deployment on AWS. It is split into two main stacks:

1. **WordpressVpcStack**  
   📌 Creates a custom **VPC**, public/private subnets, and security groups for WordPress and related components (**EC2, ALB, and RDS**).

2. **WordpressAppStack**  
   📌 Deploys the WordPress application itself—configuring an **Auto Scaling Group (ASG)** for EC2 instances, an **Application Load Balancer (ALB)**, and an **Amazon RDS instance** for the WordPress database.

---

## 📁 Table of Contents

- [🛠 Architecture Overview](#-architecture-overview)
- [🚀 Features](#-features)
- [👌 Prerequisites](#-prerequisites)
- [🛠 Getting Started](#-getting-started)
  - [1️⃣ Clone the Repository](#1️⃣-clone-the-repository)
  - [2️⃣ Install Dependencies](#2️⃣-install-dependencies)
  - [3️⃣ Bootstrapping CDK](#3️⃣-bootstrapping-cdk)
  - [4️⃣ Deploy the Stacks](#4️⃣-deploy-the-stacks)
  - [5️⃣ Verify Deployment](#5️⃣-verify-deployment)
- [🛠 Post-Deployment Steps](#-post-deployment-steps)
- [🦜 Cleanup](#-cleanup)
- [🔒 Security Considerations](#-security-considerations)
- [📝 License](#-license)

---

## 🛠 Architecture Overview

### 1️⃣ **Networking (WordpressVpcStack)**

- 📍 **VPC** with CIDR range `10.50.0.0/16` (configurable).
- 📍 **Public & Private Subnets** across multiple Availability Zones.
- 📍 **Security Groups**:
  - **ALB**: Allows inbound HTTP/HTTPS from the internet.
  - **EC2**: Allows inbound HTTP/HTTPS from ALB, plus SSH (for demonstration).
  - **RDS**: Allows inbound MySQL connections from EC2 security group only.

### 2️⃣ **Compute (WordpressAppStack)**

- ⚡ **Auto Scaling Group (ASG)** with EC2 instances running WordPress.
- ⚡ **Application Load Balancer (ALB)** for distributing traffic across instances.

### 3️⃣ **Database (WordpressAppStack)**

- 💄 **Amazon RDS** (MySQL) for WordPress database, deployed in private subnets.

### 4️⃣ **CloudFormation Outputs**

- 📌 **ALB DNS Name** → Retrieve it to access WordPress after deployment.
- 📌 **Exported IDs** (VPC, Security Groups, Subnet Group) for cross-stack references.

---

## 🚀 Features

✅ **High Availability** → Deployed across multiple **Availability Zones**.  
✅ **Scalability** → Auto Scaling Group (ASG) adjusts instance count based on CPU.  
✅ **Automation** → WordPress installation & configuration via **EC2 user data**.  
✅ **Cost Optimization** → Uses smaller instance types but can **scale up**.  
✅ **Security** → Access control via **IAM** & **Security Groups**.

---

## 👌 Prerequisites

- **AWS CLI** → [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **AWS CDK (v2+)** → [Installation Guide](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
- **Node.js** (Recommended LTS version **16+** or **18+**)
- **TypeScript** (if modifying TypeScript code)
- **AWS Account** with IAM permissions (**Administrator** or equivalent)
- **CDK Bootstrapped** in your AWS account/region (`cdk bootstrap`)

---

## 🛠 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/YourUsername/YourRepository.git
cd YourRepository
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Bootstrapping CDK

If you have **never used CDK** in this AWS account/region, run:

```bash
cdk bootstrap aws://<ACCOUNT_ID>/<REGION>
```

### 4️⃣ Deploy the Stacks

1. **Deploy the VPC stack**:
   ```bash
   cdk deploy WordpressVpcStack
   ```
2. **Deploy the WordPress application stack**:
   ```bash
   cdk deploy WordpressAppStack
   ```

### 5️⃣ Verify Deployment

- ✅ **Check AWS CloudFormation** → Ensure both stacks show `CREATE_COMPLETE`.
- ✅ **Retrieve the ALB DNS Name** from CloudFormation outputs or the terminal.
- ✅ **Open ALB DNS in browser** → Your WordPress site should be visible.

---

## 🦜 Cleanup

To **remove resources** & avoid **ongoing costs**, run:

1. **Destroy the WordPress Application stack**:
   ```bash
   cdk destroy WordpressAppStack
   ```
2. **Destroy the VPC stack**:
   ```bash
   cdk destroy WordpressVpcStack
   ```

---

## 🔒 Security Considerations

- **Use AWS Secrets Manager** instead of storing credentials in plain text.
- **Restrict SSH Access** → Avoid `0.0.0.0/0` for SSH. Use trusted IPs or AWS Session Manager.
- **Keep EC2 & RDS in Private Subnets** for better security.

---

## 📝 License

This project is licensed under the **MIT License**.  
Feel free to **use, modify, and distribute** this code under the license terms.

---

### 🎉 Thanks for using this AWS CDK solution!

✨ If you have **questions** or **suggestions**, please **[open an issue](../../issues)**.  
Happy coding! 🚀
