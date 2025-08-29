import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { EventsService } from '../services/events.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly for production
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Set<string>();

  constructor(private readonly eventsService: EventsService) {
    // Subscribe to events from EventsService and broadcast to all clients
    this.eventsService.getEventStream().subscribe((event) => {
      console.log('📤 Broadcasting WebSocket event:', event.type);
      this.server.emit('session-event', event);
    });

    // Send keepalive messages every 15 seconds
    setInterval(() => {
      if (this.connectedClients.size > 0) {
        console.log('📡 Sending WebSocket keepalive to', this.connectedClients.size, 'clients');
        this.server.emit('keepalive', { type: 'keepalive', timestamp: Date.now() });
      }
    }, 15000);
  }

  handleConnection(client: Socket) {
    console.log('🟢 WebSocket client connected:', client.id);
    this.connectedClients.add(client.id);
    
    // Send immediate connection confirmation
    client.emit('session-event', { 
      type: 'connected', 
      timestamp: Date.now(),
      clientId: client.id 
    });
    
    console.log('📊 Total connected clients:', this.connectedClients.size);
  }

  handleDisconnect(client: Socket) {
    console.log('🔴 WebSocket client disconnected:', client.id);
    this.connectedClients.delete(client.id);
    console.log('📊 Total connected clients:', this.connectedClients.size);
  }

  // Method to get connection count (useful for debugging)
  getConnectionCount(): number {
    return this.connectedClients.size;
  }
}
