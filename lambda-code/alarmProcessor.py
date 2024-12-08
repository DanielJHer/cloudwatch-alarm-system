import boto3
import json
from dateTime import dateTime

# Initialize resources
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['TABLE_NAME']
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        if 'Records' in event:
            # Handle SNS triggered events
            for record in event['Records']:
                sns_message = json.loads(record['Sns']['Message'])
                alarm_name = sns_message['AlarmName']
                state = sns_message['NewStateValue']
                timestamp = datetime.utcnow().isoformat()

                # Write to DynamoDB
                table.put_item(
                    Item={
                        'AlarmName': alarm_name,
                        'State': state,
                        'Timestamp': timestamp,
                    }
                )
                print(f"Logged alarm: {alarm_name} | State: {state} | Timestamp: {timestamp}")
        else:
            # Handle EventBridge-triggered events
            response = table.scan()
            items = response.get('Items', [])

            # Generate a summary report
            report = "\n".join(
                [f"Alarm: {item['AlarmName']}, State: {item['State']}, Time: {item['Timestamp']}" for item in items]
            )
            print("daily Alarm Report:")
            print(report)

    except Exception as e:
        print("Error processing event: {e}")
        raise