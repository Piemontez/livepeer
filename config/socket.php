<?php

return [

    /*
     * $httpHost HTTP hostname clients intend to connect to.
     * MUST match JS `new WebSocket('ws://$httpHost')
     */

    'httpHost' => 'livepeer.local',


    /*
     * Port to listen on. If 80, assuming production,
     * Flash on 843 otherwise expecting Flash to be proxied through 8843
     */

    'port' => '8081',


    /*
     *IP address to bind to. Default is localhost/proxy only.
     *'0.0.0.0' for any machine.
     */
    'address' => '0.0.0.0'
];