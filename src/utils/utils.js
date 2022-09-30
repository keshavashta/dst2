import base64 from 'base-64';
import {OTP_API_URL, HTTP_BASIC_USER, HTTP_BASIC_PASS, API_KEY, HASURA_QUERY_URL, API_BASE_URL, APPLICATION_ID} from '../common/config';
import { store } from '../redux/store';
import {loaderSet, notifySet, userSet} from '../redux/actions';
import { queryString, userLogout } from '../common/globals';


const validateResponse = async (response) => {
  const apiRes = await response.json();
  const jsonResponse = {
    ...apiRes,
    responseStatus: false,
  };
  /*const { resp: { params: { status, errMsg } } } = jsonResponse;
  if (status === 'Success') {
    const { resp: { result: { responseMsg } } } = jsonResponse;
    jsonResponse.responseStatus = true;
    jsonResponse.message = responseMsg;
  } else {
    jsonResponse.responseStatus = false;
    jsonResponse.message = errMsg;
  }*/
  return jsonResponse;
};

const handleNetworkError = async (responseError) => {
  if (responseError.name !== 'AbortError') {
    store.dispatch(loaderSet(false));
    store.dispatch(notifySet({
      type: 'error',
      message: 'Network request error. Please try again.',
    }));
  }
};


const generateHasuraAPI = async (query) => {
  if(store.getState().user?.user?.tokenExpirationInstant < +new Date()){
    const reqData = {
      "token": store.getState().user?.user?.token,
      "refreshToken": store.getState().user?.user?.refreshToken
    };
    try {
      await RefreshToken(reqData);
    }
    catch (e) {
      return userLogout();
    }
  }

  return fetch(HASURA_QUERY_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${store.getState().user?.user?.token}`,
    },
    body: JSON.stringify(query)
  }).then(async (response) => await validateResponse(response))
      .catch((error) => handleNetworkError(error));
};

export const RefreshToken = async (data) => {
  const res = await fetch(`${API_BASE_URL}/refresh-token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: API_KEY,
      "x-application-id": APPLICATION_ID
    },
    body: JSON.stringify(data)
  });
  const {result: {user}} = await validateResponse(res);
  if(user.token){
    const localUser = store.getState().user;
    localUser.user.token = user.token;
    localUser.user.refreshToken = user.refreshToken;
    localUser.user.tokenExpirationInstant = user.tokenExpirationInstant;
    store.dispatch(userSet(localUser));
  }else{
    throw new Error('unable to set new token');
  }
};

export const sendOTP = async (data) => fetch(`${OTP_API_URL}/dst/sendOTP?${queryString(data)}`, {
  method: 'GET',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Basic ${base64.encode(`${HTTP_BASIC_USER}:${HTTP_BASIC_PASS}`)}`,
  },
}).then(async (response) => await validateResponse(response))
  .catch((error) => handleNetworkError(error));

export const verifyOTP = async (data) => fetch(`${OTP_API_URL}/dst/verifyOTP?${queryString(data)}`, {
  method: 'GET',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Basic ${base64.encode(`${HTTP_BASIC_USER}:${HTTP_BASIC_PASS}`)}`,
  },
}).then(async (response) => await validateResponse(response))
  .catch((error) => handleNetworkError(error));

export const ITIlogin = (data) => fetch(`${API_BASE_URL}/login/pin`, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    // Authorization: `Basic ${base64.encode(`${HTTP_BASIC_USER}:${HTTP_BASIC_PASS}`)}`,
    Authorization: API_KEY,
  },
  body: JSON.stringify(data)
}).then(async (response) => await validateResponse(response))
    .catch((error) => handleNetworkError(error));

export const ResetPIN = (data) => fetch(`${API_BASE_URL}/changePin`, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: API_KEY,
    "x-application-id": APPLICATION_ID
  },
  body: JSON.stringify(data)
}).then(async (response) => await validateResponse(response))
    .catch((error) => handleNetworkError(error));



export const getAcademicCalendarLinks = (data) => {
  const query = {
    query: `query MyQuery($name: String) {
      iti_academic_calendar_link(where: {iti: {name: {_eq: $name}}}, limit: 1) {
        calendar_link
        id
        created_at
      }
    }`,
    "variables": {name: data.itiName}
  };
  return generateHasuraAPI(query);
};

export const getLoggedInITIDetails = (data) => {
  const query = {
    query: `query MyQuery($name: String) {
      principal(where: {iti: {_eq: $name}}, limit: 1) {
        principal_name
        iti
        email_id
        district
        contact_number
      }
    }`,
    "variables": {name: data.itiName}
  };
  return generateHasuraAPI(query);
};

export const getITIsList = () => {
  const query = {
    query: `query {
      iti {
        id
        name
        district
        latitude
        longitude
      }
    }`
  };
  return generateHasuraAPI(query);
};

export const getIndustriesList = () => {
  const query = {
    query: `query {
      industry {
        id
        name
        district
      }
    }`
  };
  return generateHasuraAPI(query);
};

export const createDstMc = (data) => {
  const query = {
    query: `mutation create_dst_mc_meeting($objects: [dst_mc_meeting_insert_input!] = {}) {
      insert_dst_mc_meeting(objects: $objects) {
        returning {
          id
        }
      }
    }`,
    "variables": {objects: data}
  };
  return generateHasuraAPI(query);
};

//todo: need to test this api
export const updateDstMc = (data) => {
  const query = {
    query: `mutation MyMutation($id: bigint = "", $industry_id: Int = 10) {
      update_dst_mc_meeting_by_pk(pk_columns: {id: $id}, _set: {industry_id: $industry_id}) {
        industry_id
        id
      }
    }`,
    "variables": {id: data.id, industry_id: data.industryId}
  };
  return generateHasuraAPI(query);
};

export const deleteDstMc = (data) => {
  const query = {
    query: `mutation ($id: String) {
      delete_dst_mc_meeting_by_pk(id: $id) {
        id
      }
    }`,
    "variables": {id: data.id}
  };
  return generateHasuraAPI(query);
};

//todo: need to test these filtered apis
export const getFilteredTrades = (data) => {
  const query = {
    query: `query ($iti_id: Int) {
      dst_mc_meeting(where: {iti_id: {_eq: $iti_id}}) {
        id
        district
        iti_id
        iti {
          id
          name
        }
        industry {
          id
          name
          district
        }
        batch
        trade
      }
    }`,
    "variables": {iti_id: data.itiId}
  };
  return generateHasuraAPI(query);
};

export const getFilteredBatch = (data) => {
  const query = {
    query: `query ($iti_id: Int, $trade: String) {
      dst_mc_meeting(where: {iti_id: {_eq: $iti_id}, trade: {_eq: $trade}}) {
        id
        district
        iti_id
        iti {
          id
          name
        }
        industry {
          id
          name
          district
        }
        batch
        trade
      }
    }`,
    "variables": {iti_id: data.itiId, trade: data.trade}
  };
  return generateHasuraAPI(query);
};

export const getFilteredIndustry = (data) => {
  const query = {
    query: `query ($iti_id: Int, $trade: String, $batch: String) {
      dst_mc_meeting(where: {iti_id: {_eq: $iti_id}, trade: {_eq: $trade}, batch: {_eq: $batch}}) {
        id
        district
        iti_id
        iti {
          id
          name
        }
        industry {
          id
          name
          district
        }
        batch
        trade
      }
    }`,
    "variables": {iti_id: data.itiId, trade: data.trade, batch: data.batch}
  };
  return generateHasuraAPI(query);
};

