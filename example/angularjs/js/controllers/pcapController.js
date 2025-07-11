/**
 * PCAP-Element 测试控制器
 * 使用正确的 pcap-element API 进行测试
 */

(function() {
    'use strict';

    angular.module('pcapApp')
        .controller('PcapController', ['$scope', '$rootScope', function($scope, $rootScope) {
            var vm = this;

            // 初始化控制器状态
            vm.currentFile = null;
            vm.error = null;
            vm.testStatus = '准备就绪';
            vm.libraryLoaded = false;
            vm.testStartTime = null;
            vm.parseTime = null;
            vm.selectedSampleFile = '';
            vm.customUrl = '';

            // 示例文件列表 - 使用实际的sample-data文件
            vm.sampleFiles = [
                { 
                    name: 'session.pcap', 
                    size: '719KB', 
                    url: '/example/angularjs/sample-data/session.pcap',
                    description: '包含多个会话的数据包 (7372个数据包)'
                },
                { 
                    name: 'http-packets.pcap', 
                    size: '2.6MB', 
                    url: '/example/angularjs/sample-data/http-packets.pcap',
                    description: 'HTTP流量数据包 (大文件)'
                },
                { 
                    name: 'frag_http_req.pcap', 
                    size: '2.0KB', 
                    url: '/example/angularjs/sample-data/frag_http_req.pcap',
                    description: '分片HTTP请求 (13个数据包)'
                },
                { 
                    name: 'smtp.pcap', 
                    size: '27KB', 
                    url: '/example/angularjs/sample-data/smtp.pcap',
                    description: 'SMTP邮件协议数据包 (888个数据包)'
                }
            ];



            /**
             * 加载选中的示例文件
             */
            vm.loadSelectedFile = function() {
                if (!vm.selectedSampleFile || vm.selectedSampleFile === '') {
                    vm.showError('请选择一个示例文件');
                    return;
                }
                
                var selectedIndex = parseInt(vm.selectedSampleFile);
                var selectedFile = vm.sampleFiles[selectedIndex];
                
                if (selectedFile) {
                    vm.loadFileByUrl(selectedFile.url, selectedFile.name, selectedFile.size);
                }
            };

            /**
             * 加载自定义URL
             */
            vm.loadCustomUrl = function() {
                if (!vm.customUrl || vm.customUrl.trim() === '') {
                    vm.showError('请输入有效的URL');
                    return;
                }
                
                var url = vm.customUrl.trim();
                var fileName = url.split('/').pop() || 'custom.pcap';
                
                vm.loadFileByUrl(url, fileName, '未知大小');
            };

            /**
             * 通过URL加载文件
             */
            vm.loadFileByUrl = function(url, fileName, fileSize) {
                vm.error = null;
                vm.testStatus = '正在加载文件...';
                vm.testStartTime = new Date().toLocaleString('zh-CN');
                
                // 验证文件URL是否可访问
                vm.checkFileAccess(url)
                    .then(function() {
                        vm.currentFile = {
                            name: fileName,
                            size: fileSize,
                            url: url,
                            description: '自定义URL文件'
                        };
                        vm.testStatus = '文件加载成功，pcap-element 正在解析...';
                        vm.showSuccess('开始测试文件: ' + fileName);
                        
                        // 触发pcap-element的更新
                        $scope.$apply();
                    })
                    .catch(function(error) {
                        vm.error = '文件访问失败: ' + error.message;
                        vm.testStatus = '文件加载失败';
                        vm.showError(vm.error);
                        $scope.$apply();
                    });
            };



            /**
             * 检查文件是否可访问
             */
            vm.checkFileAccess = function(url) {
                return new Promise(function(resolve, reject) {
                    var xhr = new XMLHttpRequest();
                    xhr.open('HEAD', url, true);
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState === 4) {
                            if (xhr.status === 200) {
                                resolve();
                            } else {
                                reject(new Error('HTTP ' + xhr.status + ': ' + xhr.statusText));
                            }
                        }
                    };
                    xhr.onerror = function() {
                        reject(new Error('网络错误'));
                    };
                    xhr.send();
                });
            };

            /**
             * 清除当前测试
             */
            vm.clearTest = function() {
                vm.currentFile = null;
                vm.error = null;
                vm.testStatus = '准备就绪';
                vm.testStartTime = null;
                vm.parseTime = null;
                vm.selectedSampleFile = '';
                vm.customUrl = '';
                
                // 清除pcap-element的内容
                var pcapElement = document.getElementById('pcapViewer');
                if (pcapElement) {
                    pcapElement.removeAttribute('src');
                }
                
                vm.showSuccess('测试已清除');
            };

            /**
             * 显示成功消息
             */
            vm.showSuccess = function(message) {
                console.log('SUCCESS:', message);
                if ($rootScope.utils && $rootScope.utils.showNotification) {
                    $rootScope.utils.showNotification(message, 'success');
                }
            };

            /**
             * 显示错误消息
             */
            vm.showError = function(message) {
                vm.error = message;
                console.error('ERROR:', message);
                if ($rootScope.utils && $rootScope.utils.showNotification) {
                    $rootScope.utils.showNotification(message, 'error');
                }
            };

            // 监听当前文件变化，更新pcap-element
            $scope.$watch('vm.currentFile', function(newFile) {
                if (newFile) {
                    // 给pcap-element一点时间来更新
                    setTimeout(function() {
                        var pcapElement = document.getElementById('pcapViewer');
                        if (pcapElement) {
                            // 清除之前的src
                            pcapElement.removeAttribute('src');
                            // 设置新的src
                            pcapElement.setAttribute('src', newFile.url);
                            console.log('pcap-element src 已更新:', newFile.url);
                        }
                    }, 100);
                }
            });

            // 初始化完成后的处理
            $scope.$on('$viewContentLoaded', function() {
                console.log('PCAP-Element 测试控制器已初始化');
                
                // 检查pcap-element是否可用
                setTimeout(function() {
                    if (typeof customElements !== 'undefined' && customElements.get('pcap-element')) {
                        console.log('pcap-element 已加载');
                        vm.testStatus = 'pcap-element 库已就绪';
                        vm.libraryLoaded = true;
                        $scope.$apply();
                    } else {
                        console.warn('pcap-element 未找到，请检查库是否正确加载');
                        vm.testStatus = 'pcap-element 库未加载';
                        vm.libraryLoaded = false;
                        vm.error = 'pcap-element 库未正确加载，请检查网络连接或库文件';
                        $scope.$apply();
                    }
                }, 2000); // 给更多时间让模块加载
            });

            // 监听pcap-element的事件（如果支持）
            $scope.$on('$viewContentLoaded', function() {
                setTimeout(function() {
                    var pcapElement = document.getElementById('pcapViewer');
                    if (pcapElement) {
                        // 监听可能的错误事件
                        pcapElement.addEventListener('error', function(event) {
                            console.error('pcap-element 错误:', event);
                            vm.error = 'pcap-element 解析错误: ' + (event.detail ? event.detail.message : '未知错误');
                            vm.testStatus = '解析失败';
                            $scope.$apply();
                        });

                        // 监听加载完成事件
                        pcapElement.addEventListener('load', function(event) {
                            console.log('pcap-element 加载完成:', event);
                            vm.testStatus = '解析完成';
                            vm.parseTime = new Date().toLocaleString('zh-CN');
                            $scope.$apply();
                        });
                    }
                }, 3000);
            });
        }]);
})(); 