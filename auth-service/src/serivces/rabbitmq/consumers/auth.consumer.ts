import rabbitMQClient from "../../../config/rabbitmq";
import { createNewRetaurantAccount } from "../../../models/restaurant/restaurant_accounts.model";
import { AUTH_EXCHANGE, AUTHL_QUEUE, DLQ_QUEUE, DLX, MAX_RETRIES } from "./constants";

export class AuthConsumer {
    private static initialized = false;

    static async initialize(): Promise<void> {
        if (this.initialized) return;

        const channel = rabbitMQClient.getChannel();

        // 1. FIXED: Assert DLX (Not DLQ_QUEUE)
        await channel.assertExchange(DLX, 'direct', { durable: true });
        
        await channel.assertQueue(DLQ_QUEUE, { durable: true });
        await channel.bindQueue(DLQ_QUEUE, DLX, 'to-dlq');

        await channel.assertExchange(AUTH_EXCHANGE, "topic", { durable: true });
        await channel.assertQueue(AUTHL_QUEUE, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': DLX,
                'x-dead-letter-routing-key': 'to-dlq'
            }
        });

        await channel.bindQueue(AUTHL_QUEUE, AUTH_EXCHANGE, "restaurant.*");

        await channel.prefetch(1); 

        await channel.consume(AUTHL_QUEUE, async (msg: any) => {
            if (!msg) return;

            // 2. FIXED: 'fields' is plural
            const routingKey = msg.fields.routingKey; 
            
            try {
                // Parse once outside the switch so it's available to all cases
                const content = JSON.parse(msg.content.toString());
                
                switch (routingKey) {
                    case 'restaurant.create':
                        
                        const createData: RestaurantCreateConsumerType = content;
                        await createNewRetaurantAccount(
                            createData.id, 
                            createData.email, 
                            createData.phone_number, 
                            createData.reference_id, 
                            createData.auth_status
                        );
                        console.log(`✅ Auth account created for ${createData.id}`);
                        break;
                    case 'restaurant.update':
                        // await updateRestaurantAccount(content);
                        break;
                    case 'restaurant.delete':
                        // await deleteRestaurantAccount(content.id);
                        break;
                    default:
                        console.warn(`⚠️ Unhandled event type: ${routingKey}`);
                        break;
                }
                
                // Acknowledge successful processing
                channel.ack(msg);

            } catch (err) {
                console.error(`❌ Event Failed [${routingKey}]:`, err);
                
                const headers = msg.properties.headers || {};
                const currentRetries = headers['x-retry-count'] || 0;
                
                if (currentRetries < MAX_RETRIES) {
                    console.log(`🔄 Retrying... Attempt ${currentRetries + 1} of ${MAX_RETRIES}`);
                    
                    // Republish the message to the back of the queue with an incremented counter
                    channel.publish(AUTH_EXCHANGE, routingKey, msg.content, {
                        ...msg.properties,
                        headers: { 
                            ...headers, 
                            'x-retry-count': currentRetries + 1 
                        }
                    });
                    
                    // Acknowledge the old, failed message so it leaves the queue
                    channel.ack(msg);
                } else {
                    console.error(`🚫 Max retries (${MAX_RETRIES}) reached. Sending to DLQ.`);
                    // Reject the message completely. DLX arguments will route it to AUTHDLQ
                    channel.nack(msg, false, false);
                }
            }
        });

        this.initialized = true;
        console.log(`🚀 AuthConsumer listening on [${AUTHL_QUEUE}]`);
    }
}

interface RestaurantCreateConsumerType {
    id: string;
    email: string | null; 
    phone_number: number | null; 
    auth_status: string | null;
    reference_id: string | null;
}