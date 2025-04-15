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
                        selectedPhotos: []
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
        // 选中的照片索引数组
        selectedPhotos: [] as number[],
        // 每行显示的照片数量
        photosPerRow: 4,
        // 复选框样式对象（用于动态设置样式）
        checkboxStyles: {} as Record<number, any>,
        // 已选中照片的映射（用于UI渲染）
        checkedPhotos: {} as Record<number, boolean>
    },

    // 组件生命周期函数，在组件实例进入页面节点树时执行
    attached() {
        // 确保初始状态下没有选中的照片
        this.setData({
            selectedPhotos: []
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
        // 处理照片选择
        onSelectPhoto(e: WechatMiniprogram.TouchEvent) {
            try {
                // 确保点击元素上有有效的数据索引
                if (!e.currentTarget || !e.currentTarget.dataset || e.currentTarget.dataset.index === undefined) {
                    console.error('Missing index in dataset:', e.currentTarget?.dataset);
                    return;
                }

                const index = Number(e.currentTarget.dataset.index);
                console.log('Clicked index:', index, 'Type:', typeof index);

                // 获取当前选中状态的副本
                const selectedPhotos = [...this.data.selectedPhotos];
                console.log('Current selectedPhotos:', selectedPhotos);

                // 检查照片是否已经被选中，确保使用严格相等
                const selectedIndex = selectedPhotos.findIndex(item => Number(item) === index);
                console.log('Found at index:', selectedIndex);

                // 更新选中状态
                if (selectedIndex === -1) {
                    // 照片未被选中，将其选中
                    selectedPhotos.push(index);
                    console.log('Adding to selected, new array:', selectedPhotos);
                } else {
                    // 照片已被选中，取消选中
                    selectedPhotos.splice(selectedIndex, 1);
                    console.log('Removing from selected, new array:', selectedPhotos);
                }

                // 直接操作 DOM 更新样式（注意：这是临时解决方案）
                this.updateCheckboxUI(index, selectedIndex === -1);

                // 更新数据，并确保在更新完成后执行回调
                this.setData({
                    selectedPhotos: selectedPhotos
                }, () => {
                    // 回调确认数据已更新
                    console.log('Updated selectedPhotos:', this.data.selectedPhotos);

                    // 调试检查是否包含当前索引
                    const isSelected = this.data.selectedPhotos.some(item => Number(item) === index);
                    console.log(`Photo ${index} is now ${isSelected ? 'selected' : 'unselected'}`);

                    // 更新所有复选框 UI
                    this.updateAllCheckboxes();
                });
            } catch (error) {
                console.error('Error in onSelectPhoto:', error);
            }
        },

        // 更新单个复选框 UI
        updateCheckboxUI(index: number, isSelected: boolean) {
            try {
                const query = this.createSelectorQuery();
                query.select(`#checkbox-${index}`).fields({
                    node: true,
                    size: true,
                    properties: ['class']
                }, (res) => {
                    console.log(`Checkbox ${index} element:`, res);
                    if (res && res.node) {
                        // 注意：这种方式在微信小程序中可能不完全支持
                        if (isSelected) {
                            wx.nextTick(() => {
                                // 使用 setData 更新数据，触发视图重新渲染
                                const dataPath = `checkboxStyles[${index}]`;
                                this.setData({
                                    [`checkboxStyles[${index}]`]: {
                                        backgroundColor: '#07C160',
                                        borderColor: '#07C160',
                                        display: 'block'
                                    }
                                });
                                console.log(`Set style for checkbox ${index}:`, this.data.checkboxStyles?.[index]);
                            });
                        }
                    }
                }).exec();
            } catch (error) {
                console.error('Error updating checkbox UI:', error);
            }
        },

        // 更新所有复选框状态
        updateAllCheckboxes() {
            // 遍历所有照片，更新其复选框状态
            this.data.photos.forEach((_, index) => {
                const isSelected = this.isPhotoSelected(index);
                const dataKey = `checkedPhotos[${index}]`;

                this.setData({
                    [dataKey]: isSelected
                });

                console.log(`Updated checkbox ${index} to ${isSelected ? 'checked' : 'unchecked'}`);
            });
        },

        // 检查照片是否被选中
        isPhotoSelected(index: number): boolean {
            const isSelected = this.data.selectedPhotos.some(item => Number(item) === index);
            console.log(`Checking if photo ${index} is selected:`, isSelected);
            return isSelected;
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
            this.setData({ selectedPhotos: [] });
            console.log('Photos sent, reset selectedPhotos');

            // 关闭照片选择界面 - 触发close事件，让父组件处理
            this.triggerEvent('close');
            console.log('[EVENT] photo-selector close event triggered');
        },

        // 重置组件状态
        resetState() {
            this.setData({
                selectedPhotos: []
            });
            console.log('Reset state called');
        }
    }
}) 