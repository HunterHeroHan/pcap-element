/**
 * PCAP文件预览器 - AngularJS 1.8应用
 * 基于pcap-element库的网络数据包分析工具
 */

(function() {
    'use strict';

    // 创建AngularJS应用模块
    angular.module('pcapApp', [])
        .config(['$locationProvider', function($locationProvider) {
            // 配置HTML5模式（可选）
            $locationProvider.html5Mode({
                enabled: true,
                requireBase: false
            });
        }])
        .run(['$rootScope', function($rootScope) {
            // 全局错误处理
            $rootScope.$on('$error', function(event, error) {
                console.error('Application error:', error);
            });

            // 全局加载状态
            $rootScope.isLoading = false;

            // 全局工具函数
            $rootScope.utils = {
                // 显示通知
                showNotification: function(message, type = 'info') {
                    console.log(`${type.toUpperCase()}: ${message}`);
                }
            };
        }]);
})(); 