interface IPageData {
    ingredients: Array<{
        name: string;
    }>;
    healthInfo: {
        age: number;
        weight: number;
    };
    currentIngredient: string;
}

Page<IPageData, WechatMiniprogram.IAnyObject>({
    data: {
        ingredients: [],
        healthInfo: {
            age: 0,
            weight: 0
        },
        currentIngredient: ''
    },

    onLoad() {
        // 加载已保存的食材和健康信息
        this.loadSavedData();
    },

    // 食材相关方法
    onIngredientInput(e: WechatMiniprogram.Input) {
        this.setData({
            currentIngredient: e.detail.value
        });
    },

    startVoiceInput() {
        // 调用微信录音接口
        const recorderManager = wx.getRecorderManager();
        recorderManager.start({
            duration: 60000,
            sampleRate: 16000,
            numberOfChannels: 1,
            encodeBitRate: 48000,
            format: 'mp3'
        });

        wx.showToast({
            title: '开始录音',
            icon: 'none'
        });
    },

    addIngredient() {
        const { currentIngredient, ingredients } = this.data;
        if (!currentIngredient) {
            wx.showToast({
                title: '请输入食材名称',
                icon: 'none'
            });
            return;
        }

        this.setData({
            ingredients: [...ingredients, { name: currentIngredient }],
            currentIngredient: ''
        });

        // 保存到本地存储
        this.saveIngredients();
    },

    deleteIngredient(e: WechatMiniprogram.TouchEvent) {
        const index = e.currentTarget.dataset.index;
        const ingredients = this.data.ingredients;
        ingredients.splice(index, 1);
        this.setData({ ingredients });
        this.saveIngredients();
    },

    // 健康信息相关方法
    onAgeInput(e: WechatMiniprogram.Input) {
        this.setData({
            'healthInfo.age': parseInt(e.detail.value) || 0
        });
    },

    onWeightInput(e: WechatMiniprogram.Input) {
        this.setData({
            'healthInfo.weight': parseFloat(e.detail.value) || 0
        });
    },

    saveHealthInfo() {
        const { age, weight } = this.data.healthInfo;
        if (!age || !weight) {
            wx.showToast({
                title: '请填写完整信息',
                icon: 'none'
            });
            return;
        }

        // 保存到本地存储
        wx.setStorageSync('healthInfo', this.data.healthInfo);
        wx.showToast({
            title: '保存成功',
            icon: 'success'
        });
    },

    // 生成菜谱
    generateRecipe() {
        if (this.data.ingredients.length === 0) {
            wx.showToast({
                title: '请先添加食材',
                icon: 'none'
            });
            return;
        }

        // TODO: 调用AI API生成菜谱
        wx.showLoading({
            title: '生成中...'
        });
    },

    // 数据持久化
    loadSavedData() {
        try {
            const ingredients = wx.getStorageSync('ingredients') || [];
            const healthInfo = wx.getStorageSync('healthInfo') || {
                age: 0,
                weight: 0
            };
            this.setData({ ingredients, healthInfo });
        } catch (e) {
            console.error('加载本地数据失败:', e);
        }
    },

    saveIngredients() {
        wx.setStorageSync('ingredients', this.data.ingredients);
    }
}); 