import * as sinon from 'sinon';
import { expect } from 'chai';
import { SocketServerProvider } from '../socket-server-provider';
import { WebSocketsController } from '../web-sockets-controller';
import { WebSocketGateway } from '../utils/socket-gateway.decorator';
import { InvalidSocketPortException } from '../exceptions/invalid-socket-port.exception';
import { GatewayMetadataExplorer } from '../gateway-metadata-explorer';

describe('WebSocketsController', () => {
    let instance: WebSocketsController;
    let provider: SocketServerProvider,
        mockProvider: sinon.SinonMock;

    const port = 90, namespace = '/';
    @WebSocketGateway({ port, namespace })
    class Test {

    }

    beforeEach(() => {
        provider = new SocketServerProvider(null);
        mockProvider = sinon.mock(provider);
        instance = new WebSocketsController(provider);
    });
    describe('hookGatewayIntoServer', () => {
        let subscribeObservableServer: sinon.SinonSpy;

        @WebSocketGateway(<any>{ port: 'test' })
        class InvalidGateway {}

        @WebSocketGateway()
        class DefaultGateway {}

        beforeEach(() => {
            subscribeObservableServer = sinon.spy();
            instance['subscribeObservableServer'] = subscribeObservableServer;
        });
        it('should throws "InvalidSocketPortException" when port is not a number', () => {
            expect(
                () => instance.hookGatewayIntoServer(new InvalidGateway(), InvalidGateway)
            ).throws(InvalidSocketPortException);
        });
        it('should call "subscribeObservableServer" with default values when metadata is empty', () => {
            const gateway = new DefaultGateway();
            instance.hookGatewayIntoServer(gateway, DefaultGateway);
            expect(subscribeObservableServer.calledWith(gateway, '', 80)).to.be.true;
        });
        it('should call "subscribeObservableServer" when metadata is valid', () => {
            const gateway = new Test();
            instance.hookGatewayIntoServer(gateway, Test);
            expect(subscribeObservableServer.calledWith(gateway, namespace, port)).to.be.true;
        });
    });
    describe('subscribeObservableServer', () => {
        let explorer: GatewayMetadataExplorer,
            mockExplorer: sinon.SinonMock,
            gateway, handlers, server,
            hookServerToProperties: sinon.SinonSpy,
            subscribeEvents: sinon.SinonSpy;

        beforeEach(() => {
            gateway = new Test();
            explorer = new GatewayMetadataExplorer();
            mockExplorer = sinon.mock(explorer);
            (<any>instance)['metadataExplorer'] = explorer;

            handlers = [ 'test' ];
            server = { server: 'test' };

            mockExplorer.expects('explore').returns(handlers);
            mockProvider.expects('scanForSocketServer').returns(server);

            hookServerToProperties = sinon.spy();
            subscribeEvents = sinon.spy();

            instance['hookServerToProperties'] = hookServerToProperties;
            instance['subscribeEvents'] = subscribeEvents;
        });
        it('should call "hookServerToProperties" with expected arguments', () => {
            instance.subscribeObservableServer(gateway, namespace, port);
            expect(hookServerToProperties.calledWith(gateway, server.server));
        });
        it('should call "subscribeEvents" with expected arguments', () => {
            instance.subscribeObservableServer(gateway, namespace, port);
            expect(subscribeEvents.calledWith(gateway, handlers, server));
        });
    });
    describe('subscribeEvents', () => {
        const gateway = new Test();

        let handlers;
        let server,
            nextSpy: sinon.SinonSpy,
            onSpy: sinon.SinonSpy,
            subscribeInitEvent: sinon.SinonSpy,
            getConnectionHandler: sinon.SinonSpy;

        beforeEach(() => {
            nextSpy = sinon.spy();
            onSpy = sinon.spy();
            subscribeInitEvent = sinon.spy();
            getConnectionHandler = sinon.spy();

            handlers = [ 'test' ];
            server = {
                init: {
                    next: nextSpy
                },
                server: {
                    on: onSpy,
                    disconnect: {},
                    connection: {},
                },
            };

            instance['subscribeInitEvent'] = subscribeInitEvent;
            instance['getConnectionHandler'] = getConnectionHandler;
        });

        it('should call "next" method of server object with expected argument', () => {
            instance.subscribeEvents(gateway, handlers, <any>server);
            expect(nextSpy.calledWith(server.server)).to.be.true;
        });
        it('should call "subscribeInitEvent" with expected arguments', () => {
            instance.subscribeEvents(gateway, handlers, <any>server);
            expect(subscribeInitEvent.calledWith(gateway, server.init)).to.be.true;
        });
        it('should bind connection handler to server', () => {
            instance.subscribeEvents(gateway, handlers, <any>server);
            expect(onSpy.calledWith('connection', getConnectionHandler())).to.be.true;
        });
        it('should call "getConnectionHandler" with expected arguments', () => {
            instance.subscribeEvents(gateway, handlers, <any>server);
            expect(getConnectionHandler.calledWith(
                instance,
                gateway,
                handlers,
                server.disconnect,
                server.connection
            )).to.be.true;
        });
    });
    describe('getConnectionHandler', () => {
        const gateway = new Test();

        let handlers, fn;
        let connection, client,
            nextSpy: sinon.SinonSpy,
            onSpy: sinon.SinonSpy,
            subscribeMessages: sinon.SinonSpy,
            subscribeDisconnectEvent: sinon.SinonSpy,
            subscribeConnectionEvent: sinon.SinonSpy;

        beforeEach(() => {
            nextSpy = sinon.spy();
            onSpy = sinon.spy();
            subscribeMessages = sinon.spy();
            subscribeDisconnectEvent = sinon.spy();
            subscribeConnectionEvent = sinon.spy();

            handlers = [ 'test' ];
            connection = {
                next: nextSpy
            };
            client = {
                on: onSpy,
            };
            instance['subscribeDisconnectEvent'] = subscribeDisconnectEvent;
            instance['subscribeConnectionEvent'] = subscribeConnectionEvent;
            instance['subscribeMessages'] = subscribeMessages;

            fn = instance.getConnectionHandler(instance, gateway, handlers, null, connection);
            fn(client);
        });

        it('should returns function', () => {
            expect(instance.getConnectionHandler(null, null, null, null, null)).to.be.a('function');
        });
        it('should call "subscribeConnectionEvent" with expected arguments', () => {
            expect(subscribeConnectionEvent.calledWith(gateway, connection)).to.be.true;
        });
        it('should call "next" method of connection object with expected argument', () => {
            expect(nextSpy.calledWith(client)).to.be.true;
        });
        it('should call "subscribeMessages" with expected arguments', () => {
            expect(subscribeMessages.calledWith(handlers, client, gateway)).to.be.true;
        });
        it('should call "subscribeDisconnectEvent" with expected arguments', () => {
            expect(subscribeDisconnectEvent.calledWith(gateway, null)).to.be.true;
        });
        it('should call "on" method of client object with expected arguments', () => {
            expect(onSpy.called).to.be.true;
        });
    });
    describe('subscribeInitEvent', () => {
        const gateway = new Test();
        let event, subscribe: sinon.SinonSpy;

        beforeEach(() => {
            subscribe = sinon.spy();
            event = { subscribe };
        });
        it('should not call subscribe method when "afterInit" method not exists', () => {
            instance.subscribeInitEvent(gateway, event);
            expect(subscribe.called).to.be.false;
        });
        it('should call subscribe method of event object with expected arguments when "afterInit" exists', () => {
            gateway['afterInit'] = () => {};
            instance.subscribeInitEvent(gateway, event);
            expect(subscribe.called).to.be.true;
        });
    });
    describe('subscribeConnectionEvent', () => {
        const gateway = new Test();
        let event, subscribe: sinon.SinonSpy;

        beforeEach(() => {
            subscribe = sinon.spy();
            event = { subscribe };
        });
        it('should not call subscribe method when "handleConnection" method not exists', () => {
            instance.subscribeConnectionEvent(gateway, event);
            expect(subscribe.called).to.be.false;
        });
        it('should call subscribe method of event object with expected arguments when "handleConnection" exists', () => {
            gateway['handleConnection'] = () => {};
            instance.subscribeConnectionEvent(gateway, event);
            expect(subscribe.called).to.be.true;
        });
    });
    describe('subscribeDisconnectEvent', () => {
        const gateway = new Test();
        let event, subscribe: sinon.SinonSpy;

        beforeEach(() => {
            subscribe = sinon.spy();
            event = { subscribe };
        });
        it('should not call subscribe method when "handleDisconnect" method not exists', () => {
            instance.subscribeDisconnectEvent(gateway, event);
            expect(subscribe.called).to.be.false;
        });
        it('should call subscribe method of event object with expected arguments when "handleDisconnect" exists', () => {
            gateway['handleDisconnect'] = () => {};
            instance.subscribeDisconnectEvent(gateway, event);
            expect(subscribe.called).to.be.true;
        });
    });
    describe('subscribeMessages', () => {
        const gateway = new Test();

        let client, handlers,
            onSpy: sinon.SinonSpy;

        beforeEach(() => {
            onSpy = sinon.spy();
            client = { on: onSpy };

            handlers = [
                { message: 'test', targetCallback: { bind: () => 'testCallback' }},
                { message: 'test2', targetCallback: { bind: () => 'testCallback2' }},
            ];
        });
        it('should bind each handler to client', () => {
            instance.subscribeMessages(handlers, client, gateway);

            expect(onSpy.calledTwice).to.be.true;
            expect(onSpy.calledWith('test', 'testCallback')).to.be.true;
            expect(onSpy.calledWith('test2', 'testCallback2')).to.be.true;
        });
    });
});