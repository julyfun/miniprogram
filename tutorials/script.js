// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function () {
    // 点击事件示例
    const clickBtn = document.getElementById('click-btn');
    const clickResult = document.getElementById('click-result');

    if (clickBtn && clickResult) {
        let clickCount = 0;

        clickBtn.addEventListener('click', function () {
            clickCount++;
            if (clickCount === 1) {
                clickResult.textContent = '你点击了按钮一次！';
            } else {
                clickResult.textContent = `你点击了按钮 ${clickCount} 次！`;
            }

            // 添加一个动画效果
            clickResult.style.backgroundColor = '#f0f4ff';
            setTimeout(() => {
                clickResult.style.backgroundColor = 'transparent';
            }, 300);
        });
    }

    // 表单验证示例
    const validationForm = document.getElementById('validation-form');
    const usernameInput = document.getElementById('username');
    const usernameError = document.getElementById('username-error');

    if (validationForm && usernameInput && usernameError) {
        validationForm.addEventListener('submit', function (event) {
            event.preventDefault(); // 阻止表单提交

            const username = usernameInput.value.trim();

            // 重置错误消息
            usernameError.textContent = '';
            usernameInput.style.borderColor = '';

            // 验证用户名
            if (username === '') {
                usernameError.textContent = '用户名不能为空';
                usernameInput.style.borderColor = '#ff3860';
                return;
            }

            if (username.length < 3) {
                usernameError.textContent = '用户名长度不能少于3个字符';
                usernameInput.style.borderColor = '#ff3860';
                return;
            }

            // 验证通过
            usernameError.textContent = '验证通过！';
            usernameError.style.color = '#4a6bff';
            usernameInput.style.borderColor = '#4a6bff';
        });

        // 实时验证
        usernameInput.addEventListener('input', function () {
            const username = usernameInput.value.trim();

            if (username.length > 0 && username.length < 3) {
                usernameError.textContent = '用户名长度不能少于3个字符';
                usernameError.style.color = '#ff3860';
                usernameInput.style.borderColor = '#ff3860';
            } else {
                usernameError.textContent = '';
                usernameInput.style.borderColor = '';
            }
        });
    }

    // 动态内容示例
    const timeDisplay = document.getElementById('time-display');
    const updateTimeBtn = document.getElementById('update-time-btn');

    if (timeDisplay && updateTimeBtn) {
        // 更新时间函数
        function updateTime() {
            const now = new Date();
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            timeDisplay.textContent = now.toLocaleDateString('zh-CN', options);
            // 添加动画效果
            timeDisplay.classList.add('time-updated');
            setTimeout(() => {
                timeDisplay.classList.remove('time-updated');
            }, 500);
        }

        // 初始化时间
        updateTime();

        // 点击按钮更新时间
        updateTimeBtn.addEventListener('click', updateTime);

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #time-display {
                padding: 1rem;
                background-color: #f0f4ff;
                border-radius: 4px;
                margin-bottom: 1rem;
                transition: background-color 0.3s;
            }
            .time-updated {
                background-color: #4a6bff !important;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    // 表单交互增强
    const demoForm = document.getElementById('demo-form');
    if (demoForm) {
        const inputs = demoForm.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');

        // 为每个输入字段添加交互效果
        inputs.forEach(input => {
            // 添加占位符文本淡出效果
            input.addEventListener('focus', function () {
                this.parentNode.classList.add('input-focus');
            });

            input.addEventListener('blur', function () {
                if (this.value.trim() === '') {
                    this.parentNode.classList.remove('input-focus');
                }
            });

            // 如果已经有值，添加类
            if (input.value.trim() !== '') {
                input.parentNode.classList.add('input-focus');
            }
        });

        // 添加样式
        const formStyle = document.createElement('style');
        formStyle.textContent = `
            .form-group {
                position: relative;
            }
            .input-focus label {
                color: #4a6bff;
            }
        `;
        document.head.appendChild(formStyle);
    }

    // 平滑滚动导航
    const navLinks = document.querySelectorAll('.main-nav a');

    navLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 20,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 返回顶部按钮
    const backToTopBtn = document.createElement('button');
    backToTopBtn.textContent = '返回顶部';
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.style.display = 'none';
    document.body.appendChild(backToTopBtn);

    // 样式
    const topBtnStyle = document.createElement('style');
    topBtnStyle.textContent = `
        .back-to-top {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #4a6bff;
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            text-align: center;
            line-height: 1.2;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            transition: all 0.3s;
            z-index: 1000;
            font-size: 0.8rem;
        }
        .back-to-top:hover {
            background-color: #2541b2;
            transform: translateY(-3px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
    `;
    document.head.appendChild(topBtnStyle);

    // 显示/隐藏按钮
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 300) {
            backToTopBtn.style.display = 'block';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });

    // 点击返回顶部
    backToTopBtn.addEventListener('click', function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // 代码高亮
    const codeElements = document.querySelectorAll('code');
    codeElements.forEach(element => {
        element.textContent = element.textContent.trim();
    });

    // 截断内容
    const explanation = document.querySelectorAll('.explanation p');
    explanation.forEach(p => {
        const originalText = p.textContent;
        if (originalText.length > 150) {
            const truncated = originalText.substring(0, 150) + '...';
            p.textContent = truncated;

            const readMore = document.createElement('button');
            readMore.textContent = '阅读更多';
            readMore.className = 'read-more';
            readMore.style.fontSize = '0.8rem';
            readMore.style.padding = '0.2rem 0.5rem';
            readMore.style.marginLeft = '0.5rem';

            let isExpanded = false;

            readMore.addEventListener('click', function () {
                if (isExpanded) {
                    p.textContent = truncated;
                    readMore.textContent = '阅读更多';
                    isExpanded = false;
                } else {
                    p.textContent = originalText;
                    readMore.textContent = '收起';
                    isExpanded = true;
                }
                p.appendChild(readMore);
            });

            p.appendChild(readMore);
        }
    });
}); 