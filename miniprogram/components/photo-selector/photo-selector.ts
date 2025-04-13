Component({
    /**
     * 组件的属性列表
     */
    properties: {
        // 是否显示照片选择界面
        visible: {
            type: Boolean,
            value: false
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        // 照片列表（这里使用同一张照片）
        photos: Array(12).fill('/assets/images/photo-alnum-example/farm.png'),
        // 选中的照片索引数组
        selectedPhotos: [] as number[],
        // 每行显示的照片数量
        photosPerRow: 4
    },

    /**
     * 组件的方法列表
     */
    methods: {
        // 处理返回按钮点击
        onBack() {
            // 触发关闭事件
            this.triggerEvent('close');
        },

        // 处理照片选择
        onSelectPhoto(e: WechatMiniprogram.TouchEvent) {
            const index = e.currentTarget.dataset.index;
            const selectedPhotos = [...this.data.selectedPhotos];

            // 检查照片是否已经被选中
            const selectedIndex = selectedPhotos.indexOf(index);

            if (selectedIndex === -1) {
                // 照片未被选中，将其选中
                selectedPhotos.push(index);
            } else {
                // 照片已被选中，取消选中
                selectedPhotos.splice(selectedIndex, 1);
            }

            this.setData({ selectedPhotos });
        },

        // 处理发送按钮点击
        onSend() {
            // 如果没有选中任何照片，显示提示
            if (this.data.selectedPhotos.length === 0) {
                wx.showToast({
                    title: '请选择至少一张照片',
                    icon: 'none'
                });
                return;
            }

            // 获取选中的照片路径
            const selectedPhotoUrls = this.data.selectedPhotos.map(
                index => this.data.photos[index]
            );

            // 触发发送事件，将选中的照片路径传递给父组件
            this.triggerEvent('send', { photos: selectedPhotoUrls });

            // 重置选中状态
            this.setData({ selectedPhotos: [] });

            // 关闭照片选择界面
            this.triggerEvent('close');
        },

        // 重置组件状态
        resetState() {
            this.setData({
                selectedPhotos: []
            });
        }
    }
}) 