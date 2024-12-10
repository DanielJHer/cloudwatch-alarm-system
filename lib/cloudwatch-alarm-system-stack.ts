import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
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

    // Initialize VPC
    const vpc = new ec2.Vpc(this, 'MyVPC', {
      maxAzs: 1,
    });

    // Security Group
    const securityGroup = new ec2.SecurityGroup(this, 'MySecurityGroup', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'EC2SecurityGroup',
    });
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access'
    );

    // EC2
    const ec2Instance = new ec2.Instance(this, 'TestInstnace', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup,
      keyName: 'bastion',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // Launch in a public subnet
      },
    });

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
      code: lambda.Code.fromAsset('lambda-code'),
      handler: 'alarmProcessor.lambda_handler',
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
        dimensionsMap: { InstanceId: ec2Instance.instanceId },
      }),
      // set low thershold for testing
      threshold: 1,
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
