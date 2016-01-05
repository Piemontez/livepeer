<?php

/**
 *  Routes for WebSocket
 *
 * Add route (Symfony Routing Component)
 * $socket->route('/myclass', new MyClass, ['*']);
 */

$socket->route('/ws', new App\Socket\Listener\LivePeer, ['*']);
