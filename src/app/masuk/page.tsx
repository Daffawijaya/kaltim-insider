import type {Metadata} from "next";
import {AccountScreen} from "@/components/account-screen";
export const metadata:Metadata={title:"Masuk",robots:{index:false,follow:false}};
export default function SignInPage(){return <AccountScreen mode="signin"/>}
