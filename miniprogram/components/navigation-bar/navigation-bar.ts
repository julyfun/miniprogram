Component({
  options: {
    multipleSlots: true // 在组件定义时的选项中启用多slot支持
  },
  /**
   * 组件的属性列表
   */
  properties: {
    extClass: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: ''
    },
    backIconColor: {
      type: String,
      value: ''
    },
    back: {
      type: Boolean,
      value: true
    },
    loading: {
      type: Boolean,
      value: false
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      // 显示隐藏的时候opacity动画效果
      type: Boolean,
      value: true
    },
    show: {
      // 显示隐藏导航，隐藏的时候navigation-bar的高度占位还在
      type: Boolean,
      value: true,
      observer: '_showChange'
    },
    // back为true的时候，返回的页面深度
    delta: {
      type: Number,
      value: 1
    },
  },
  /**
   * 组件的初始数据
   */
  data: {
    displayStyle: ''
  },
  lifetimes: {
    attached() {
      const rect = wx.getMenuButtonBoundingClientRect()
      wx.getSystemInfo({
        success: (res) => {
          const isAndroid = res.platform === 'android'
          const isDevtools = res.platform === 'devtools'

          // 处理顶部安全区域
          let safeAreaTop = ''
          if (isDevtools || isAndroid) {
            // 为安卓平台增加额外空间
            const topPadding = isAndroid ? res.safeArea.top : res.safeArea.top
            safeAreaTop = `height: calc(var(--height) + ${topPadding}px); padding-top: ${topPadding}px`
          }

          // 计算标题居中位置
          // 1. 获取右侧胶囊按钮位置信息
          const menuButtonWidth = rect.width + (res.windowWidth - rect.left) * 2;  // 胶囊按钮宽度加两侧留白

          // 2. 计算标题居中所需的左偏移量
          // 我们需要确保标题在整个屏幕的中心，而不是内容区域的中心
          const titleCenterPosition = res.windowWidth / 2;  // 屏幕中间点

          // 3. 计算标题居中样式
          const titleCenterStyle = `left: ${titleCenterPosition}px; transform: translateX(-50%);`;

          this.setData({
            ios: !isAndroid,
            innerPaddingRight: `padding-right: ${res.windowWidth - rect.left}px`,
            leftWidth: `width: ${res.windowWidth - rect.left}px`,
            safeAreaTop: safeAreaTop,
            titleCenterStyle: titleCenterStyle // 新增标题居中样式
          })
        }
      })
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    _showChange(show: boolean) {
      const animated = this.data.animated
      let displayStyle = ''
      if (animated) {
        displayStyle = `opacity: ${show ? '1' : '0'
          };transition:opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }
      this.setData({
        displayStyle
      })
    },
    back() {
      const data = this.data
      if (data.delta) {
        wx.navigateBack({
          delta: data.delta
        })
      }
      this.triggerEvent('back', { delta: data.delta }, {})
    },
    home() {
      this.triggerEvent('home', {}, {})
    }
  },
})
