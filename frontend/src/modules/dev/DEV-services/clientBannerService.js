import { apiRequest } from './clientBaseApiService';

const clientBannerService = {
  getActiveBanners: async () => {
    try {
      const response = await apiRequest('/client/banners');
      if (response?.success && response?.data) {
        return response.data;
      }
      return { banners: [], carouselIntervalSeconds: 5 };
    } catch (error) {
      return { banners: [], carouselIntervalSeconds: 5 };
    }
  }
};

export default clientBannerService;
