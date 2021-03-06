import * as sinon from 'sinon';
import { expect } from 'chai';
import { SocketServerProvider } from '../socket-server-provider';
import { SocketsContainer } from '../container';

describe('SocketServerProvider', () => {
    let instance: SocketServerProvider;
    let socketsContainer: SocketsContainer,
        mockContainer: sinon.SinonMock;

    beforeEach(() => {
        socketsContainer = new SocketsContainer();
        mockContainer = sinon.mock(socketsContainer);
        instance = new SocketServerProvider(socketsContainer);
    });
    describe('scanForSocketServer', () => {
        let createSocketServerSpy: sinon.SinonSpy;
        const namespace = 'test';
        const port = 30;

        beforeEach(() => {
            createSocketServerSpy = sinon.spy();
            instance['createSocketServer'] = createSocketServerSpy;
        });
        it(`should returns stored server`, () => {
            const server = { test: 'test' };
            mockContainer.expects('getSocketServer').returns(server);

            const result = instance.scanForSocketServer(namespace, port);

            expect(createSocketServerSpy.called).to.be.false;
            expect(result).to.eq(server);
        });
        it(`should call "createSocketServer" when server is not stored already`, () => {
            mockContainer.expects('getSocketServer').returns(null);

            instance.scanForSocketServer(namespace, port);
            expect(createSocketServerSpy.called).to.be.true;
        });
    });
});