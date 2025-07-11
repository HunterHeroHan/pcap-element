/**
 * 字节格式化过滤器
 * 将字节数转换为人类可读的格式
 */

(function() {
    'use strict';

    angular.module('pcapApp')
        .filter('bytes', function() {
            return function(bytes, decimals) {
                if (bytes === 0) return '0 Bytes';
                
                var k = 1024;
                var dm = decimals < 0 ? 0 : decimals || 2;
                var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
                
                var i = Math.floor(Math.log(bytes) / Math.log(k));
                
                return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
            };
        });
})(); 