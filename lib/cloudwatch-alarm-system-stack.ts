import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class CloudwatchAlarmSystemStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Initialize DynamoDB
    const alarmTable = new dynamodb.Table(this, 'AlarmTable', {
      partitionKey: { name: 'AlarmName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // SNS Topic
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'Cloudwatch Alarm Notification',
    });

    // Lambda function
    const alarmProcessor = new lambda.Function(this, 'AlarmProcessor', {
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset('lambdafile'), // path to lambda function code
      handler: 'index.handler',
      environment: {
        TABLE_NAME: alarmTable.tableName,
      },
    });

    // Grant lambda function write permission to dynamodb
    alarmTable.grantWriteData(alarmProcessor);

    // Subscribe Lambda to the SNS Topic
    alarmTopic.addSubscription(
      new snsSubscriptions.LambdaSubscription(alarmProcessor)
    );

    // Cloud watch Alarm
    const highCpuAlarm = new cloudwatch.Alarm(this, 'HighCPUAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensionsMap: { InstanceId: 'instnaceidreplacehere' },
      }),
      threshold: 80,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // Bind cloudwatch alarm to SNS topic
    highCpuAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: alarmTopic.topicArn }),
    });

    // EventBridge rule for period reporting
    const reportingRule = new events.Rule(this, 'ReportingRule', {
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
    });

    // Add lambda function as target for Eventbridge rule
    reportingRule.addTarget(new targets.LambdaFunction(alarmProcessor));
  }
}
