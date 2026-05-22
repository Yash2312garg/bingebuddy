import { Request, Response } from 'express';
import { getRestaurantInformation } from '../../../../src/controllers/user/user.controller';
import { getRestaurantinfo } from '../../../../src/models/auth/auth.model';
import { RestaurantDao } from '../../../../src/dao/restaurant.dao';

jest.mock('../../../../src/models/auth/auth.model');
jest.mock('../../../../src/dao/restaurant.dao');

const mockGetRestaurantinfo = getRestaurantinfo as jest.Mock;
const mockGetRestaurantData = RestaurantDao.getRestaurantData as jest.Mock;
const mockSaveRestaurantData = RestaurantDao.saveRestaurantData as jest.Mock;

describe('getRestaurantInformation', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let statusSpy: jest.Mock;
    let jsonSpy: jest.Mock;

    beforeEach(() => {
        statusSpy = jest.fn().mockReturnThis();
        jsonSpy = jest.fn();
        mockRequest = {};
        mockResponse = {
            status: statusSpy,
            json: jsonSpy,
        };
        jest.clearAllMocks();
    });

    it('should return 401 if user is not authenticated', async () => {
        mockRequest.user = undefined;
        await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

        expect(statusSpy).toHaveBeenCalledWith(401);
        expect(jsonSpy).toHaveBeenCalledWith({ message: 'Unauthorized' });
        expect(mockGetRestaurantData).not.toHaveBeenCalled();
        expect(mockGetRestaurantinfo).not.toHaveBeenCalled();
    });

    it('should return restaurant data from redis cache if available', async () => {
        const mockUser = { reference_id: 'user123' };
        const mockRestaurantData = { id: 1, name: 'Test Restaurant' };
        mockRequest.user = mockUser;

        mockGetRestaurantData.mockResolvedValue(mockRestaurantData);

        await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

        expect(mockGetRestaurantData).toHaveBeenCalledWith(mockUser.reference_id);
        expect(statusSpy).toHaveBeenCalledWith(200);
        expect(jsonSpy).toHaveBeenCalledWith({ message: 'sucessfull', restaurantData: mockRestaurantData });
        expect(mockGetRestaurantinfo).not.toHaveBeenCalled();
        expect(mockSaveRestaurantData).not.toHaveBeenCalled();
    });

    it('should fetch from DB, save to cache, and return data if redis cache is empty', async () => {
        const mockUser = { reference_id: 'user123' };
        const mockRestaurantDataFromDb = { id: 2, name: 'DB Restaurant' };
        mockRequest.user = mockUser;

        mockGetRestaurantData.mockResolvedValue(null);
        mockGetRestaurantinfo.mockResolvedValue(mockRestaurantDataFromDb);
        mockSaveRestaurantData.mockResolvedValue(undefined); // Mock save operation

        await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

        expect(mockGetRestaurantData).toHaveBeenCalledWith(mockUser.reference_id);
        expect(mockGetRestaurantinfo).toHaveBeenCalledWith(mockUser.reference_id);
        expect(mockSaveRestaurantData).toHaveBeenCalledWith(mockUser.reference_id, mockRestaurantDataFromDb);
        expect(statusSpy).toHaveBeenCalledWith(200);
        expect(jsonSpy).toHaveBeenCalledWith({ message: 'sucessfull', restaurantData: mockRestaurantDataFromDb });
    });

    it('should return 503 if restaurant details cannot be fetched from DB', async () => {
        const mockUser = { reference_id: 'user123' };
        mockRequest.user = mockUser;

        mockGetRestaurantData.mockResolvedValue(null);
        mockGetRestaurantinfo.mockResolvedValue(null);

        await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

        expect(mockGetRestaurantData).toHaveBeenCalledWith(mockUser.reference_id);
        expect(mockGetRestaurantinfo).toHaveBeenCalledWith(mockUser.reference_id);
        expect(mockSaveRestaurantData).not.toHaveBeenCalled(); // Should not try to save null data
        expect(statusSpy).toHaveBeenCalledWith(503);
        expect(jsonSpy).toHaveBeenCalledWith({ message: 'Error fetching restaurant details' });
    });

    it('should return 500 if an unexpected error occurs', async () => {
        const mockUser = { reference_id: 'user123' };
        mockRequest.user = mockUser;

        mockGetRestaurantData.mockRejectedValue(new Error('Database connection failed'));

        await getRestaurantInformation(mockRequest as Request, mockResponse as Response);

        expect(mockGetRestaurantData).toHaveBeenCalledWith(mockUser.reference_id);
        expect(statusSpy).toHaveBeenCalledWith(500);
        expect(jsonSpy).toHaveBeenCalledWith({ message: 'Internal Server Error' });
        expect(mockGetRestaurantinfo).not.toHaveBeenCalled();
        expect(mockSaveRestaurantData).not.toHaveBeenCalled();
    });
});