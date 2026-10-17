import { configureStore, createSlice } from '@reduxjs/toolkit';
const session=createSlice({name:'session',initialState:{user:null,ready:false},reducers:{setUser:(s,a)=>{s.user=a.payload;s.ready=true},clearUser:s=>{s.user=null;s.ready=true}}});
export const {setUser,clearUser}=session.actions;
export const store=configureStore({reducer:{session:session.reducer}});
