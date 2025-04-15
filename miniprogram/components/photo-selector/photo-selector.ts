Component({
    /**
     * 组件的属性列表
     */
    properties: {
        // 是否显示照片选择界面
        visible: {
            type: Boolean,
            value: false,
            observer(newVal, oldVal) {
                console.log(`Photo selector visibility changed: ${oldVal} -> ${newVal}`);

                // 当组件变为可见时，重置选中状态
                if (newVal) {
                    this.setData({
                        selectedPhotos: [] // Reset selected photos when component becomes visible
                    });
                    console.log('Photo selector visible, resetting selectedPhotos');
                }
            }
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        // 照片列表（这里使用同一张照片）
        photos: Array(12).fill('/assets/images/photo-alnum-example/farm.png'),
        // 选中的照片索引数组 - This will be the single source of truth for checkbox state
        selectedPhotos: [] as number[],
        // 每行显示的照片数量
        photosPerRow: 4,
        // 照片选中状态映射 - 用于WXML中的简单条件判断
        selectedMap: [] as boolean[]
    },

    // 组件生命周期函数，在组件实例进入页面节点树时执行
    attached() {
        // 确保初始状态下没有选中的照片
        const selectedMap = Array(12).fill(false);
        this.setData({
            selectedPhotos: [],
            selectedMap: selectedMap
        });
        console.log('[LIFECYCLE] Photo selector component attached');
    },

    // 组件生命周期函数，组件布局完成后执行
    ready() {
        console.log('[LIFECYCLE] Photo selector component ready');
    },

    /**
     * 组件的方法列表
     */
    methods: {
        // Removed updateCheckboxUI and updateAllCheckboxes methods

        // 处理照片选择 - Simplified logic
        onSelectPhoto(e: WechatMiniprogram.TouchEvent) {
            const index = Number(e.currentTarget.dataset.index);
            if (isNaN(index)) {
                console.error('Invalid index received from dataset:', e.currentTarget.dataset.index);
                return;
            }

            const selectedPhotos = [...this.data.selectedPhotos];
            const existingIndex = selectedPhotos.indexOf(index);
            const selectedMap = [...this.data.selectedMap];

            if (existingIndex === -1) {
                // Not selected, add it
                selectedPhotos.push(index);
                selectedMap[index] = true;
                console.log('Selected photo index:', index);
            } else {
                // Already selected, remove it
                selectedPhotos.splice(existingIndex, 1);
                selectedMap[index] = false;
                console.log('Deselected photo index:', index);
            }

            // Update the state, the WXML will reactively update based on selectedMap
            this.setData({
                selectedPhotos,
                selectedMap
            });
            console.log('Updated selectedPhotos:', this.data.selectedPhotos);
            console.log('Updated selectedMap:', this.data.selectedMap);
        },

        // 检查照片是否被选中 (Helper function, might be useful but not strictly needed for UI)
        isPhotoSelected(index: number): boolean {
            return this.data.selectedPhotos.includes(index);
        },

        // 处理发送按钮点击
        onSend() {
            // 如果没有选中任何照片，显示提示
            if (this.data.selectedPhotos.length === 0) {
                wx.showToast({
                    title: '请选择至少一张照片',
                    icon: 'none'
                });
                console.log('No photos selected, showing toast');
                return;
            }

            // 获取选中的照片路径
            const selectedPhotoUrls = this.data.selectedPhotos.map(
                index => this.data.photos[index]
            );
            console.log('Sending photos:', selectedPhotoUrls);

            // 触发发送事件，将选中的照片路径传递给父组件
            this.triggerEvent('send', { photos: selectedPhotoUrls });

            // 重置选中状态
            this.resetState(); // Use resetState to clear photos
            console.log('Photos sent, state reset');

            // 关闭照片选择界面 - 触发close事件，让父组件处理
            this.triggerEvent('close');
            console.log('[EVENT] photo-selector close event triggered');
        },

        // 重置组件状态
        resetState() {
            const selectedMap = Array(this.data.photos.length).fill(false);
            this.setData({
                selectedPhotos: [], // Ensure selectedPhotos is cleared
                selectedMap: selectedMap // Reset all selection states to false
            });
            console.log('Photo selector state reset');
        }
    }
}) 