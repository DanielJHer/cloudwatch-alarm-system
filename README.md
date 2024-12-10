# CloudWatch Alarm Logging System

## Overview

This project demonstrates how to build a serverless system to automatically log AWS CloudWatch alarm events into DynamoDB using AWS services like Lambda, SNS, and CDK. The system monitors an EC2 instance's CPU utilization, logs alarm details for historical tracking, and can be easily extended for more advanced use cases.

## Features

Real-Time Alarm Logging:
CloudWatch alarms trigger notifications via SNS.
A Lambda function processes alarm events and logs them into DynamoDB.
Centralized Alarm Storage:
DynamoDB table stores alarm name, state, and timestamp for easy analysis.
AWS Infrastructure as Code:
All resources are deployed using AWS CDK.

## Architecture

CloudWatch Alarm: Monitors EC2 CPU utilization.
SNS Topic: Sends alarm notifications to Lambda.
Lambda Function: Processes notifications and writes data to DynamoDB.
DynamoDB: Stores alarm logs with a partition key (AlarmName) and a sort key (Timestamp).

## Technologies Used

AWS Cloud Development Kit (CDK): TypeScript
AWS Services:
CloudWatch
SNS
Lambda
DynamoDB
EC2
