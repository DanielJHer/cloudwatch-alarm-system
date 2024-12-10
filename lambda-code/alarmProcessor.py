import boto3
import json
import os
from datetime import datetime

# Initialize resources
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['TABLE_NAME']
table = dynamodb.Table(table_name)
sns = boto3.client('sns')

def lambda_handler(event, context):
    try:
        if 'Records' in event:
            # Handle SNS-triggered events
            for record in event['Records']:
                sns_message = json.loads(record['Sns']['Message'])
                alarm_name = sns_message.get('AlarmName')
                state = sns_message.get('NewStateValue')
                timestamp = datetime.utcnow().isoformat()

                # Write to DynamoDB
                table.put_item(
                    Item={
                        'AlarmName': alarm_name,
                        'State': state,
                        'Timestamp': timestamp,
                    }
                )
                print(f"Logged alarm: {alarm_name}, State: {state}, Time: {timestamp}")
    except Exception as e:
        print(f"Error processing event: {e}")
        raise
