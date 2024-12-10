#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CloudwatchAlarmSystemStack } from '../lib/cloudwatch-alarm-system-stack';

const app = new cdk.App();

new CloudwatchAlarmSystemStack(app, 'CloudwatchAlarmSystemStack');
