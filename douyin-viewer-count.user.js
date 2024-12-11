// ==UserScript==
// @name         抖音直播间人数显示
// @namespace    https://www.phpnbw.com/
// @version      1.4
// @description  显示抖音直播间实时观看人数
// @author       phpnbw
// @match        https://live.douyin.com/*
// @match        https://www.douyin.com/*
// @grant        GM_xmlhttpRequest
// @license      Copyright phpnbw
// @connect      dyapi.phpnbw.com
// ==/UserScript==

(function() {
    'use strict';

    // 缓存 webcastId
    let cachedWebcastId = null;
    let cachedUrl = null;

    function getWebcastId() {
        const currentUrl = window.location.href;

        // 如果URL没有变化且已有缓存的webcastId，直接返回缓存值
        if (currentUrl === cachedUrl && cachedWebcastId !== null) {
            console.log('使用缓存的直播间ID:', cachedWebcastId);
            return cachedWebcastId;
        }

        // 更新当前URL
        cachedUrl = currentUrl;

        // 如果是主页面，直接返回null
        if (currentUrl === 'https://live.douyin.com/' || currentUrl === 'https://live.douyin.com' ||
            currentUrl === 'https://www.douyin.com/follow' || currentUrl === 'https://www.douyin.com/follow/live') {
            console.log('当前是直播主页面，不显示观看人数');
            cachedWebcastId = null;
            return null;
        }

        // 尝试匹配三种格式的URL
        // 格式1: https://live.douyin.com/613217711064
        // 格式2: https://live.douyin.com/613217711064?from_tab_name=main
        // 格式3: https://www.douyin.com/follow/live/574023227986
        const match = currentUrl.match(/\/(\d+)(?:\?|$)/) || currentUrl.match(/\/live\/(\d+)(?:\?|$)/);

        if (match) {
            console.log('找到直播间ID:', match[1]);
            cachedWebcastId = match[1];
            return cachedWebcastId;
        }

        console.log('未找到直播间ID');
        cachedWebcastId = null;
        return null;
    }

    async function fetchViewerCount() {
        const webcastId = getWebcastId();
        if (!webcastId) {
            throw new Error('未找到直播间ID');
        }

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://dyapi.phpnbw.com/get_live_room_num?webcast_id=${webcastId}`,
                timeout: 5000,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        // 打印获取到的数据
                        console.log('API Response:', data);
                        const viewerCount = data?.data?.data?.data?.[0]?.room_view_stats?.display_value || '未知';
                        console.log('观看人数:', viewerCount); // 打印观看人数
                        resolve(viewerCount);
                    } catch (error) {
                        console.error('解析数据失败:', error);
                        reject(error);
                    }
                },
                onerror: function(error) {
                    console.error('请求失败:', error);
                    reject(error);
                },
                ontimeout: function() {
                    reject(new Error('请求超时'));
                }
            });
        });
    }

    function showViewerCount(count) {
        // 移除旧的显示元素（如果存在）
        const oldDisplay = document.getElementById('viewer-count-display');
        if (oldDisplay) {
            oldDisplay.remove();
        }

        // 创建显示元素，改用 a 标签
        const display = document.createElement('a');
        display.id = 'viewer-count-display';
        
        // 设置链接地址
        const webcastId = getWebcastId();
        display.href = `https://douyin.phpnbw.com/?id=${webcastId}`;
        
        // 添加悬浮提示
        display.title = '点击查看详细观看数据统计';
        
        // 添加新的样式
        display.style.cssText = `
            display: inline-block;
            background-color: rgba(0, 0, 0, 0.7);
            color: red;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 16px;
            z-index: 9999;
            text-decoration: none;
            cursor: pointer;
        `;
        
        if (count !== '未知' && count !== '获取失败') {
            display.textContent = `观看人数: ${count}`;
        }

        // 添加鼠标悬停效果
        display.addEventListener('mouseover', () => {
            display.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            display.style.color = '#ff4444';
        });
        
        display.addEventListener('mouseout', () => {
            display.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            display.style.color = 'red';
        });

        // 打开新标签页
        display.target = '_blank';

        // 剩余的定位代码保持不变
        const xpath = "/html/body/div[2]/div[2]/div/main/div[2]/div/div/div/pace-island/div/div/div[1]/div[1]";
        const targetElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (targetElement) {
            targetElement.style.position = 'relative';
            display.style.marginLeft = '10px';
            targetElement.appendChild(display);
        } else {
            display.style.position = 'fixed';
            display.style.top = '75px';
            display.style.right = '50px';
            document.body.appendChild(display);
        }
    }

    async function updateViewerCount() {
        try {
            const count = await fetchViewerCount();
            showViewerCount(count);
        } catch (error) {
            console.error('获取观看人数失败:', error);
            showViewerCount('获取失败');
        }
    }

    function init() {
        const url = window.location.href;
        console.log('当前URL====================================:', url);
        console.log('====================================');
        // 如果是主页面，直接返回，不执行任何操作
        if (url === 'https://live.douyin.com/' || url === 'https://live.douyin.com' ||  url ==='https://www.douyin.com/follow' ||
            url === 'https://www.douyin.com/follow/live') {
            console.log('当前是直播主页面，不显示观看人数1');
            return;
        }

        // 只有在不是主页面的情况下才执行更新操作
        console.log('开始初始化直播间观看人数显示');
        setInterval(updateViewerCount, 5000);
        updateViewerCount();
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 为了处理可能的动态加载情况，也监听 URL 变化
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            console.log('URL changed, reinitializing...');
            init();
        }
    }).observe(document, {subtree: true, childList: true});
})();